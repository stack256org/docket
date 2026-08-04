import { createId } from "@paralleldrive/cuid2";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { webhookEndpoints } from "@/db/schema/webhooks";

export const webhookDeliveryStatus = pgEnum("webhook_delivery_status", [
  "queued",
  "sending",
  "sent",
  "failed",
]);

// The exact JSON body sent to the destination — frozen at enqueue time so a
// later edit to the endpoint or the ticket doesn't change what a retry sends.
export interface WebhookDeliveryPayload {
  id: string;
  event: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    payload: jsonb("payload").$type<WebhookDeliveryPayload>().notNull(),
    status: webhookDeliveryStatus("status").notNull().default("queued"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    responseStatus: integer("response_status"),
    lastError: text("last_error"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("webhook_deliveries_webhook_id_created_at_idx").on(
      t.webhookId,
      t.createdAt
    ),
    index("webhook_deliveries_status_idx").on(t.status),
    index("webhook_deliveries_status_claimed_at_idx").on(
      t.status,
      t.claimedAt
    ),
    index("webhook_deliveries_entity_idx").on(t.entityType, t.entityId),
  ]
);
