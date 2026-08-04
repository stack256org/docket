import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { webhookDeliveries, webhookEndpoints } from "@/db/schema";
import { db } from "@/lib/db";
import type { WebhookEvent } from "@/lib/webhooks/events";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

export interface TicketEventTicket {
  category: string;
  createdAt: Date;
  customerEmail: string;
  customerName: string;
  id: string;
  priority: string;
  status: string;
  subject: string;
  ticketNumber: number;
  updatedAt: Date;
}

/** The `data.ticket` shape sent in every ticket-related webhook payload. */
export function ticketPayloadData(ticket: TicketEventTicket) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    customerName: ticket.customerName,
    customerEmail: ticket.customerEmail,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

/**
 * Fans a ticket event out to every active endpoint subscribed to it — one
 * `webhook_deliveries` row + one queued job per matching endpoint. Fire and
 * forget from the caller's side (same convention as `enqueueEmail()` /
 * `publishTicketCreated()`): callers should `await dispatchWebhookEvent(...).catch(...)`
 * right next to those existing calls, never let it block the request.
 * No-ops cleanly when no endpoints are configured or subscribed.
 */
export async function dispatchWebhookEvent(
  event: WebhookEvent,
  entityType: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  const endpoints = await db
    .select({ id: webhookEndpoints.id, events: webhookEndpoints.events })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.isActive, true));

  const matching = endpoints.filter((e) => e.events.includes(event));
  if (matching.length === 0) {
    return;
  }

  const payload = {
    id: `evt_${createId()}`,
    event,
    createdAt: new Date().toISOString(),
    data,
  };

  await Promise.all(
    matching.map(async (endpoint) => {
      const [row] = await db
        .insert(webhookDeliveries)
        .values({
          webhookId: endpoint.id,
          event,
          entityType,
          entityId,
          payload,
          status: "queued",
        })
        .returning({ id: webhookDeliveries.id });

      await enqueueJob(JOB_NAMES.WEBHOOK_SEND, { deliveryId: row.id });
    })
  );
}
