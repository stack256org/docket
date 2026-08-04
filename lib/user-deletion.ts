import { eq } from "drizzle-orm";
import { apiKeys } from "@/db/schema/api-keys";
import { cannedResponses } from "@/db/schema/canned-responses";
import {
  ticketActivity,
  ticketAttachments,
  ticketComments,
} from "@/db/schema/tickets";
import { webhookEndpoints } from "@/db/schema/webhooks";
import type { db } from "@/lib/db";

/** `db` or a transaction handle from `db.transaction()`. */
export type DbOrTx =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Replaces a deleted user's name wherever it was snapshotted. */
export const DELETED_USER_LABEL = "Deleted user";

/**
 * Scrubs a user's name from every denormalized snapshot before their row is
 * deleted.
 *
 * Ticket history stores `authorName`/`actorName`/`uploadedByName` next to a
 * nullable FK, so a reply keeps rendering its author after the account is
 * gone — that's deliberate, and it's why *deactivating* an agent is the
 * normal off-boarding path. Hard delete is the erasure path instead, so the
 * name has to go with the account or "delete" would be a lie.
 *
 * MUST run before the `user` row is deleted: every statement here is keyed on
 * the FK, and those columns are `ON DELETE SET NULL`. Once the user is gone
 * the rows are unreachable. Callers should run this inside the same
 * transaction as the delete.
 *
 * Deliberately leaves `audit_logs` alone. It is the tamper-evident record of
 * admin actions — including this deletion — and is retained under legitimate
 * interest rather than scrubbed. Purge it separately if a given erasure
 * request requires it.
 */
export async function anonymizeUserContent(tx: DbOrTx, userId: string) {
  await tx
    .update(ticketComments)
    .set({ authorName: DELETED_USER_LABEL })
    .where(eq(ticketComments.authorId, userId));

  await tx
    .update(ticketActivity)
    .set({ actorName: DELETED_USER_LABEL })
    .where(eq(ticketActivity.actorId, userId));

  await tx
    .update(ticketAttachments)
    .set({ uploadedByName: DELETED_USER_LABEL })
    .where(eq(ticketAttachments.uploadedById, userId));

  await tx
    .update(cannedResponses)
    .set({ createdByName: DELETED_USER_LABEL })
    .where(eq(cannedResponses.createdById, userId));

  await tx
    .update(apiKeys)
    .set({ createdByName: DELETED_USER_LABEL })
    .where(eq(apiKeys.createdById, userId));

  await tx
    .update(webhookEndpoints)
    .set({ createdByName: DELETED_USER_LABEL })
    .where(eq(webhookEndpoints.createdById, userId));
}
