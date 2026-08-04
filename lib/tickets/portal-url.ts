import { eq } from "drizzle-orm";
import { apiKeys } from "@/db/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * The customer-facing ticket link for emails and the create-ticket API
 * response. Tickets created through an API key with a `portalUrlTemplate`
 * link to the integrator's own support page instead of Docket's
 * built-in `/ticket/:id` portal — every place that builds this link
 * (ticket creation, an agent's reply, closing a ticket) should call this
 * instead of re-deriving the template logic per call site.
 *
 * Server-only (queries the DB) — deliberately kept out of lib/tickets.ts,
 * which client components import for its pure formatting helpers.
 */
export async function resolveTicketPortalUrl(
  ticketId: string,
  customerToken: string,
  apiKeyId: string | null
): Promise<string> {
  const defaultUrl = `${env.NEXT_PUBLIC_APP_URL}/ticket/${ticketId}?token=${customerToken}`;
  if (!apiKeyId) {
    return defaultUrl;
  }
  const [key] = await db
    .select({ portalUrlTemplate: apiKeys.portalUrlTemplate })
    .from(apiKeys)
    .where(eq(apiKeys.id, apiKeyId))
    .limit(1);
  if (!key?.portalUrlTemplate) {
    return defaultUrl;
  }
  return key.portalUrlTemplate
    .replace(/\{\{\s*ticketId\s*\}\}/g, ticketId)
    .replace(/\{\{\s*token\s*\}\}/g, customerToken);
}
