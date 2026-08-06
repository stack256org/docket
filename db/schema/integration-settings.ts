import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Admin-configurable alternative to the optional env vars in lib/env.ts
// (SMTP, Google OAuth, Pusher Beams/Channels, S3/R2 storage) — set from the
// setup wizard or /admin/integrations instead of editing .env. Single row
// (id "default"), same pattern as platformSettings in db/schema/settings.ts.
// Every field here is a fallback source: lib/integration-settings.ts prefers
// a non-null DB value and falls back to the matching env var, so existing
// .env-only deployments are unaffected. `*Encrypted` columns are AES-256-GCM
// ciphertext (lib/crypto.ts, key derived from APP_SECRET) — never sent to
// the browser in plaintext (see app/api/admin/integration-settings/route.ts).
export const integrationSettings = pgTable("integration_settings", {
  id: text("id").primaryKey().default("default"),

  // SMTP
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPassEncrypted: text("smtp_pass_encrypted"),
  emailFrom: text("email_from"),

  // Google OAuth — read once at process boot (lib/auth.ts); changes need a
  // restart, see docs/authentication.md.
  googleClientId: text("google_client_id"),
  googleClientSecretEncrypted: text("google_client_secret_encrypted"),

  // Pusher Beams (browser/OS push)
  pusherBeamsInstanceId: text("pusher_beams_instance_id"),
  pusherBeamsSecretKeyEncrypted: text("pusher_beams_secret_key_encrypted"),

  // Pusher Channels (real-time ticket updates) — key/cluster are public
  // identifiers (served to the browser via /api/config/client), appId/secret
  // are server-only.
  pusherAppId: text("pusher_app_id"),
  pusherKey: text("pusher_key"),
  pusherSecretEncrypted: text("pusher_secret_encrypted"),
  pusherCluster: text("pusher_cluster"),

  // File storage — driver switch + credentials for the non-default drivers.
  storageDriver: text("storage_driver"), // "local" | "s3" | "r2"
  s3Bucket: text("s3_bucket"),
  s3Region: text("s3_region"),
  awsAccessKeyId: text("aws_access_key_id"),
  awsSecretAccessKeyEncrypted: text("aws_secret_access_key_encrypted"),
  r2Bucket: text("r2_bucket"),
  r2AccountId: text("r2_account_id"),
  r2AccessKeyId: text("r2_access_key_id"),
  r2SecretAccessKeyEncrypted: text("r2_secret_access_key_encrypted"),
  storagePublicBaseUrl: text("storage_public_base_url"),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
