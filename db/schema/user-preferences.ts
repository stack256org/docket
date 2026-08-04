import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";

// One row per agent/admin — personal display preferences, not org-wide
// (unlike platform_settings). `columns` is a ColumnPref[] (see
// lib/tickets-table-columns.ts) in display order.
export const userTicketTablePrefs = pgTable("user_ticket_table_prefs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  columns: jsonb("columns").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
