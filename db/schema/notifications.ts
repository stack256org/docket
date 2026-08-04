import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { tickets } from "@/db/schema/tickets";

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    // Recipient agent/admin.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // e.g. "customer_replied"
    // Related ticket (nullable; cleaned up if the ticket is hard-deleted).
    ticketId: text("ticket_id").references(() => tickets.id, {
      onDelete: "cascade",
    }),
    ticketNumber: integer("ticket_number"),
    title: text("title").notNull(),
    body: text("body"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_user_unread_idx").on(t.userId, t.isRead),
  ]
);
