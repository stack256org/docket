import { eq } from "drizzle-orm";
import { cache } from "react";
import { integrationSettings } from "@/db/schema/integration-settings";
import { decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * The single integration_settings row, or undefined if never written to (a
 * fresh install, or one that only ever used .env). Memoized per-request like
 * lib/setup.ts's isSetupComplete() — every getter below shares one query.
 */
const getRow = cache(async () => {
  const [row] = await db
    .select()
    .from(integrationSettings)
    .where(eq(integrationSettings.id, "default"))
    .limit(1);
  return row;
});

function nonEmpty(value: string | null | undefined): string | undefined {
  return value?.trim() ? value.trim() : undefined;
}

export interface SmtpSettings {
  from: string;
  host: string;
  pass: string;
  port: number;
  user: string;
}

/** DB value wins per field, env var is the fallback — see db/schema/integration-settings.ts. */
export async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const row = await getRow();
  const host = nonEmpty(row?.smtpHost) ?? env.SMTP_HOST;
  const user = nonEmpty(row?.smtpUser) ?? env.SMTP_USER;
  const from = nonEmpty(row?.emailFrom) ?? env.EMAIL_FROM;
  const pass = row?.smtpPassEncrypted
    ? decryptSecret(row.smtpPassEncrypted)
    : env.SMTP_PASS;
  const port = row?.smtpPort ?? env.SMTP_PORT ?? 587;

  if (!(host && user && pass && from)) {
    return null;
  }
  return { host, port, user, pass, from };
}

export async function isSmtpConfigured(): Promise<boolean> {
  return (await getSmtpSettings()) !== null;
}

export interface GoogleOAuthSettings {
  clientId: string;
  clientSecret: string;
}

/**
 * Read once at process boot by lib/auth.ts (top-level await) — Better Auth
 * builds its social-providers config once when that module is first
 * evaluated, so changes here only take effect after an app restart. UI
 * "is Google configured" checks call this too, for consistency, even though
 * it's a fresh DB read each time — see docs/authentication.md.
 */
export async function getGoogleOAuthSettings(): Promise<GoogleOAuthSettings | null> {
  const row = await getRow();
  const clientId = nonEmpty(row?.googleClientId) ?? env.GOOGLE_CLIENT_ID;
  const clientSecret = row?.googleClientSecretEncrypted
    ? decryptSecret(row.googleClientSecretEncrypted)
    : env.GOOGLE_CLIENT_SECRET;

  if (!(clientId && clientSecret)) {
    return null;
  }
  return { clientId, clientSecret };
}

export async function isGoogleOAuthConfigured(): Promise<boolean> {
  return (await getGoogleOAuthSettings()) !== null;
}

export interface PusherBeamsSettings {
  instanceId: string;
  secretKey: string;
}

export async function getPusherBeamsSettings(): Promise<PusherBeamsSettings | null> {
  const row = await getRow();
  const instanceId =
    nonEmpty(row?.pusherBeamsInstanceId) ??
    env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID;
  const secretKey = row?.pusherBeamsSecretKeyEncrypted
    ? decryptSecret(row.pusherBeamsSecretKeyEncrypted)
    : env.PUSHER_BEAMS_SECRET_KEY;

  if (!(instanceId && secretKey)) {
    return null;
  }
  return { instanceId, secretKey };
}

export interface PusherChannelsSettings {
  appId: string;
  cluster: string;
  key: string;
  secret: string;
}

export async function getPusherChannelsSettings(): Promise<PusherChannelsSettings | null> {
  const row = await getRow();
  const appId = nonEmpty(row?.pusherAppId) ?? env.PUSHER_APP_ID;
  const key = nonEmpty(row?.pusherKey) ?? env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster =
    nonEmpty(row?.pusherCluster) ?? env.NEXT_PUBLIC_PUSHER_CLUSTER;
  const secret = row?.pusherSecretEncrypted
    ? decryptSecret(row.pusherSecretEncrypted)
    : env.PUSHER_SECRET;

  if (!(appId && key && secret && cluster)) {
    return null;
  }
  return { appId, key, secret, cluster };
}

export interface PusherClientConfig {
  beamsInstanceId: string | null;
  pusherCluster: string | null;
  pusherKey: string | null;
}

/**
 * Public identifiers only (no secrets) — served unauthenticated via
 * GET /api/config/client so the browser can read them at runtime instead of
 * needing NEXT_PUBLIC_* baked in at Docker build time (see lib/pusher-browser.ts,
 * components/agent/push-init.tsx).
 */
export async function getPusherClientConfig(): Promise<PusherClientConfig> {
  const row = await getRow();
  return {
    pusherKey: nonEmpty(row?.pusherKey) ?? env.NEXT_PUBLIC_PUSHER_KEY ?? null,
    pusherCluster:
      nonEmpty(row?.pusherCluster) ?? env.NEXT_PUBLIC_PUSHER_CLUSTER ?? null,
    beamsInstanceId:
      nonEmpty(row?.pusherBeamsInstanceId) ??
      env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID ??
      null,
  };
}

export type StorageSettings =
  | { driver: "local" }
  | {
      driver: "s3";
      bucket: string;
      region: string | undefined;
      publicBaseUrl: string | undefined;
      accessKeyId: string | undefined;
      secretAccessKey: string | undefined;
    }
  | {
      driver: "r2";
      bucket: string;
      accountId: string;
      publicBaseUrl: string | undefined;
      accessKeyId: string | undefined;
      secretAccessKey: string | undefined;
    };

/**
 * Resolves the storage driver + its credentials. Throws with a clear message
 * on misconfiguration (s3/r2 selected without its required fields) — used to
 * be validated once at boot in lib/env.ts, but the driver can now come from
 * the DB, which lib/env.ts's eager parse can't see, so the check moved here
 * and runs lazily on first use (lib/storage.ts).
 */
export async function getStorageSettings(): Promise<StorageSettings> {
  const row = await getRow();
  const driver = (nonEmpty(row?.storageDriver) ??
    env.STORAGE_DRIVER) as StorageSettings["driver"];

  if (driver === "s3") {
    const bucket = nonEmpty(row?.s3Bucket) ?? env.S3_BUCKET;
    if (!bucket) {
      throw new Error("STORAGE_DRIVER=s3 requires an S3 bucket to be set.");
    }
    return {
      driver: "s3",
      bucket,
      region: nonEmpty(row?.s3Region) ?? env.S3_REGION,
      publicBaseUrl:
        nonEmpty(row?.storagePublicBaseUrl) ?? env.STORAGE_PUBLIC_BASE_URL,
      // DB-only, deliberately no env fallback: when neither is set, the s3
      // adapter is called without `credentials` at all, so the AWS SDK's own
      // default chain (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, IAM role, or
      // a shared profile) keeps working exactly as before — see lib/storage.ts.
      accessKeyId: nonEmpty(row?.awsAccessKeyId),
      secretAccessKey: row?.awsSecretAccessKeyEncrypted
        ? decryptSecret(row.awsSecretAccessKeyEncrypted)
        : undefined,
    };
  }

  if (driver === "r2") {
    const bucket = nonEmpty(row?.r2Bucket) ?? env.R2_BUCKET;
    const accountId = nonEmpty(row?.r2AccountId) ?? env.R2_ACCOUNT_ID;
    if (!(bucket && accountId)) {
      throw new Error(
        "STORAGE_DRIVER=r2 requires an R2 bucket and account ID to be set."
      );
    }
    return {
      driver: "r2",
      bucket,
      accountId,
      publicBaseUrl:
        nonEmpty(row?.storagePublicBaseUrl) ?? env.STORAGE_PUBLIC_BASE_URL,
      accessKeyId: nonEmpty(row?.r2AccessKeyId) ?? env.R2_ACCESS_KEY_ID,
      secretAccessKey: row?.r2SecretAccessKeyEncrypted
        ? decryptSecret(row.r2SecretAccessKeyEncrypted)
        : env.R2_SECRET_ACCESS_KEY,
    };
  }

  return { driver: "local" };
}

export interface IntegrationSettingsSummary {
  google: { clientId: string; hasClientSecret: boolean };
  pusherBeams: { instanceId: string; hasSecretKey: boolean };
  pusherChannels: {
    appId: string;
    key: string;
    cluster: string;
    hasSecret: boolean;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    from: string;
    hasPassword: boolean;
  };
  storage: {
    driver: "local" | "s3" | "r2";
    s3Bucket: string;
    s3Region: string;
    r2Bucket: string;
    r2AccountId: string;
    awsAccessKeyId: string;
    hasAwsSecretAccessKey: boolean;
    r2AccessKeyId: string;
    hasR2SecretAccessKey: boolean;
    publicBaseUrl: string;
  };
}

/**
 * DB-only view (no env fallback) of every field editable from
 * /admin/integrations — used to prefill that page's forms (and the setup
 * wizard's, which always gets the empty-row shape since nothing's been saved
 * yet at that point). Deliberately DB-only, not the resolved DB+env value:
 * this is what the admin *typed and saved*, not what's currently in effect,
 * so an env-var-configured field correctly shows blank/unset here rather
 * than leaking the env value into a form that would then treat it as
 * DB-authoritative on next save. Secrets are represented as
 * `has<Field>: boolean` only — never sent to the browser in plaintext.
 */
export async function getIntegrationSettingsSummary(): Promise<IntegrationSettingsSummary> {
  const row = await getRow();
  return {
    smtp: {
      host: row?.smtpHost ?? "",
      port: row?.smtpPort ?? 587,
      user: row?.smtpUser ?? "",
      from: row?.emailFrom ?? "",
      hasPassword: !!row?.smtpPassEncrypted,
    },
    google: {
      clientId: row?.googleClientId ?? "",
      hasClientSecret: !!row?.googleClientSecretEncrypted,
    },
    pusherBeams: {
      instanceId: row?.pusherBeamsInstanceId ?? "",
      hasSecretKey: !!row?.pusherBeamsSecretKeyEncrypted,
    },
    pusherChannels: {
      appId: row?.pusherAppId ?? "",
      key: row?.pusherKey ?? "",
      cluster: row?.pusherCluster ?? "",
      hasSecret: !!row?.pusherSecretEncrypted,
    },
    storage: {
      driver: (row?.storageDriver as "local" | "s3" | "r2" | null) ?? "local",
      s3Bucket: row?.s3Bucket ?? "",
      s3Region: row?.s3Region ?? "",
      r2Bucket: row?.r2Bucket ?? "",
      r2AccountId: row?.r2AccountId ?? "",
      awsAccessKeyId: row?.awsAccessKeyId ?? "",
      hasAwsSecretAccessKey: !!row?.awsSecretAccessKeyEncrypted,
      r2AccessKeyId: row?.r2AccessKeyId ?? "",
      hasR2SecretAccessKey: !!row?.r2SecretAccessKeyEncrypted,
      publicBaseUrl: row?.storagePublicBaseUrl ?? "",
    },
  };
}
