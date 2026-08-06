import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const platformSettings = pgTable("platform_settings", {
  id: text("id").primaryKey().default("default"),
  theme: text("theme").notNull().default("default"),
  appearanceMode: text("appearance_mode").notNull().default("auto"),
  // White-label branding — null means "use the PRODUCT_NAME/wordmark default".
  brandName: text("brand_name"),
  logoKey: text("logo_key"),
  // Per-method sign-in toggles. Fresh install: only password is on — an
  // admin explicitly enables magic link/Google from /admin/appearance.
  // Google also requires env credentials to be configured regardless of
  // this flag.
  passwordLoginEnabled: boolean("password_login_enabled").notNull().default(true),
  magicLinkEnabled: boolean("magic_link_enabled").notNull().default(false),
  googleLoginEnabled: boolean("google_login_enabled").notNull().default(false),
  // Ticket lifecycle emails (created/replied/closed/status-changed) sent by
  // Docket's own SMTP. Teams that consume the same events via outbound
  // webhooks and send their own emails from their backend can turn this off
  // to avoid duplicate notifications to the customer. Does not affect
  // agent/admin auth emails (magic link, password reset, invites) — those
  // always send regardless of this flag.
  ticketEmailNotificationsEnabled: boolean("ticket_email_notifications_enabled")
    .notNull()
    .default(true),
  // Set only when the setup wizard's Integrations step is explicitly finished
  // (or skipped via its "Continue to dashboard" button) — null means the
  // admin account exists but the wizard itself hasn't been completed yet, so
  // `/setup` should resume it rather than treat setup as done. See
  // `lib/setup.ts`'s `isSetupComplete()` vs `hasAdminUser()`.
  setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
