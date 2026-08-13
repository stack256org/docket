import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const platformSettings = pgTable("platform_settings", {
  id: text("id").primaryKey().default("default"),
  theme: text("theme").notNull().default("default"),
  appearanceMode: text("appearance_mode").notNull().default("auto"),
  // White-label branding — null means "use the PRODUCT_NAME/wordmark default".
  brandName: text("brand_name"),
  logoKey: text("logo_key"),
  // Square icon-only mark for the browser tab — a full logo (often a
  // wordmark+icon lockup) reads as mush at 16px. Null falls back to logoKey.
  faviconKey: text("favicon_key"),
  // Accent color (hex) used for buttons/links/highlights in outgoing emails —
  // null means "use the built-in default (#384959)". Body text and headings
  // stay a fixed neutral dark regardless, for guaranteed readability.
  emailAccentColor: text("email_accent_color"),
  // Per-method sign-in toggles. A fresh install has only password on; an admin
  // enables magic link/Google from /admin/appearance. Google additionally needs
  // credentials configured, regardless of this flag.
  passwordLoginEnabled: boolean("password_login_enabled").notNull().default(true),
  magicLinkEnabled: boolean("magic_link_enabled").notNull().default(false),
  googleLoginEnabled: boolean("google_login_enabled").notNull().default(false),
  // Ticket lifecycle emails sent by Docket's own SMTP. Teams that consume the
  // same events via outbound webhooks and mail from their own backend turn this
  // off to avoid duplicates. Auth emails always send, regardless of this flag.
  ticketEmailNotificationsEnabled: boolean("ticket_email_notifications_enabled")
    .notNull()
    .default(true),
  // Set only once the wizard's Integrations step is finished or skipped. Null
  // means the admin account exists but the wizard doesn't, so `/setup` resumes
  // rather than treating setup as done — see isSetupComplete vs hasAdminUser.
  setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
