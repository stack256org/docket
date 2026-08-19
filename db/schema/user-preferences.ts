import { sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";

// One row per agent/admin — personal preferences, not org-wide (unlike
// platform_settings). `columns` is a ColumnPref[] (see
// lib/tickets-table-columns.ts) in display order; `sendReplyOnEnter` controls
// the ticket reply composer's Enter-key behavior (see
// components/common/rich-text-editor.tsx). Both columns default so a row can
// be upserted from either preference alone without needing the other's value.
export const userTicketTablePrefs = pgTable("user_ticket_table_prefs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  columns: jsonb("columns").notNull().default(sql`'[]'::jsonb`),
  sendReplyOnEnter: boolean("send_reply_on_enter").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
