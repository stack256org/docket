import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Admin-editable overrides for the 4 customer-facing notification emails
// (ticket_created, ticket_replied, ticket_closed, my_tickets_list). One row
// per type, created on first save — an absent row (or a null column) means
// "use the built-in default". `body` is Tiptap JSON serialized the same way
// as tickets.description/ticketComments.content, so the existing rich-text
// renderer/editor can be reused as-is.
export const emailTemplates = pgTable("email_templates", {
  id: text("id").primaryKey(),
  type: text("type").notNull().unique(),
  subject: text("subject"),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
