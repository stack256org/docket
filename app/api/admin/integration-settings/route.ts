import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { integrationSettings } from "@/db/schema/integration-settings";
import { audit } from "@/lib/audit";
import { requireAdminFromRequest } from "@/lib/authz";
import { encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { getIntegrationSettingsSummary } from "@/lib/integration-settings";

const VALID_STORAGE_DRIVERS = new Set(["local", "s3", "r2"]);

// GET — agent/admin can read (middleware already enforced /api/admin/* access).
// Secret fields are never sent back to the browser — only whether one is set.
export async function GET() {
  return NextResponse.json(await getIntegrationSettingsSummary());
}

/** undefined = leave column untouched; "" clears it (stored as null); non-empty sets it, trimmed. */
function plainField(incoming: unknown): string | null | undefined {
  if (typeof incoming !== "string") {
    return;
  }
  const trimmed = incoming.trim();
  return trimmed === "" ? null : trimmed;
}

/** Same semantics as plainField, but encrypts non-empty values before storing. */
function secretField(incoming: unknown): string | null | undefined {
  if (typeof incoming !== "string") {
    return;
  }
  if (incoming === "") {
    return null;
  }
  return encryptSecret(incoming);
}

/** Drops keys whose resolved value is undefined, so drizzle only touches submitted fields. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

interface PatchBody {
  google?: { clientId?: unknown; clientSecret?: unknown };
  pusherBeams?: { instanceId?: unknown; secretKey?: unknown };
  pusherChannels?: {
    appId?: unknown;
    key?: unknown;
    secret?: unknown;
    cluster?: unknown;
  };
  smtp?: {
    host?: unknown;
    port?: unknown;
    user?: unknown;
    pass?: unknown;
    from?: unknown;
  };
  storage?: {
    driver?: unknown;
    s3Bucket?: unknown;
    s3Region?: unknown;
    r2Bucket?: unknown;
    r2AccountId?: unknown;
    awsAccessKeyId?: unknown;
    awsSecretAccessKey?: unknown;
    r2AccessKeyId?: unknown;
    r2SecretAccessKey?: unknown;
    publicBaseUrl?: unknown;
  };
}

// PATCH — admin only. Partial update, one section (smtp/google/pusherBeams/
// pusherChannels/storage) at a time; only fields present in that section's
// object are changed. Within a section: key omitted = unchanged, "" = clear,
// non-empty = set (encrypted for secret fields).
export async function PATCH(request: NextRequest) {
  let admin;
  try {
    admin = requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const auditSections: string[] = [];

  if (body.smtp) {
    const port =
      typeof body.smtp.port === "number"
        ? Math.trunc(body.smtp.port)
        : undefined;
    if (port !== undefined && (port < 1 || port > 65_535)) {
      return NextResponse.json(
        { error: "Invalid SMTP port." },
        { status: 400 }
      );
    }
    Object.assign(
      updates,
      compact({
        smtpHost: plainField(body.smtp.host),
        smtpPort: port,
        smtpUser: plainField(body.smtp.user),
        smtpPassEncrypted: secretField(body.smtp.pass),
        emailFrom: plainField(body.smtp.from),
      })
    );
    auditSections.push("smtp");
  }

  if (body.google) {
    Object.assign(
      updates,
      compact({
        googleClientId: plainField(body.google.clientId),
        googleClientSecretEncrypted: secretField(body.google.clientSecret),
      })
    );
    auditSections.push("google");
  }

  if (body.pusherBeams) {
    Object.assign(
      updates,
      compact({
        pusherBeamsInstanceId: plainField(body.pusherBeams.instanceId),
        pusherBeamsSecretKeyEncrypted: secretField(body.pusherBeams.secretKey),
      })
    );
    auditSections.push("pusherBeams");
  }

  if (body.pusherChannels) {
    Object.assign(
      updates,
      compact({
        pusherAppId: plainField(body.pusherChannels.appId),
        pusherKey: plainField(body.pusherChannels.key),
        pusherSecretEncrypted: secretField(body.pusherChannels.secret),
        pusherCluster: plainField(body.pusherChannels.cluster),
      })
    );
    auditSections.push("pusherChannels");
  }

  if (body.storage) {
    if (
      body.storage.driver !== undefined &&
      !VALID_STORAGE_DRIVERS.has(body.storage.driver as string)
    ) {
      return NextResponse.json(
        { error: "Invalid storage driver." },
        { status: 400 }
      );
    }
    Object.assign(
      updates,
      compact({
        storageDriver:
          typeof body.storage.driver === "string"
            ? body.storage.driver
            : undefined,
        s3Bucket: plainField(body.storage.s3Bucket),
        s3Region: plainField(body.storage.s3Region),
        r2Bucket: plainField(body.storage.r2Bucket),
        r2AccountId: plainField(body.storage.r2AccountId),
        awsAccessKeyId: plainField(body.storage.awsAccessKeyId),
        awsSecretAccessKeyEncrypted: secretField(
          body.storage.awsSecretAccessKey
        ),
        r2AccessKeyId: plainField(body.storage.r2AccessKeyId),
        r2SecretAccessKeyEncrypted: secretField(body.storage.r2SecretAccessKey),
        storagePublicBaseUrl: plainField(body.storage.publicBaseUrl),
      })
    );
    auditSections.push("storage");
  }

  if (auditSections.length === 0) {
    return NextResponse.json(
      { error: "No settings provided." },
      { status: 400 }
    );
  }

  const now = new Date();
  await db
    .insert(integrationSettings)
    .values({ id: "default", ...updates, updatedAt: now })
    .onConflictDoUpdate({
      target: integrationSettings.id,
      set: { ...updates, updatedAt: now },
    });

  await audit({
    action: "integration_settings.updated",
    actorEmail: admin.email,
    actorId: admin.id,
    description: `Updated integration settings: ${auditSections.join(", ")}`,
    entityId: "default",
    entityType: "integration_settings",
    metadata: { sections: auditSections },
  });

  return NextResponse.json({ ok: true });
}
