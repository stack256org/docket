import { createId } from "@paralleldrive/cuid2";
import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";

// An admin-configured destination that gets a signed POST when a subscribed
// ticket event happens (see lib/webhooks/dispatch.ts). `secretEncrypted` is
// AES-256-GCM encrypted at rest (lib/webhooks/crypto.ts, key derived from
// env.APP_SECRET) rather than hashed like api_keys.keyHash — unlike an API
// key (only ever compared against an inbound-supplied value), this secret
// must be recoverable by our own server to sign outgoing requests. The admin
// UI still only displays the raw secret once, at creation or rotation.
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secretEncrypted: text("secret_encrypted").notNull(),
  // Subscribed event slugs, e.g. ["ticket.created", "ticket.closed"] — see
  // the WEBHOOK_EVENTS catalog in lib/webhooks/events.ts.
  events: jsonb("events").$type<string[]>().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdById: text("created_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdByName: text("created_by_name").notNull(),
  // Quick-glance health, updated by the delivery worker on every attempt.
  lastDeliveryAt: timestamp("last_delivery_at", { withTimezone: true }),
  lastDeliveryStatus: text("last_delivery_status"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
