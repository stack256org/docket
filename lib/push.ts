import { createHmac } from "node:crypto";
import PushNotifications from "@pusher/push-notifications-server";
import { getPusherBeamsSettings } from "@/lib/integration-settings";

// Tolerance (seconds) subtracted from the token's `iat` so that a dev machine
// whose clock runs slightly ahead of Pusher's servers doesn't get the token
// rejected with "Token used before issued".
const CLOCK_SKEW_LEEWAY_SECONDS = 60;
const TOKEN_TTL_SECONDS = 24 * 60 * 60;

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// No permanent singleton here on purpose — see the matching comment in
// lib/realtime.ts. Settings can change at runtime via /admin/integrations.
async function getClient(): Promise<PushNotifications | null> {
  const settings = await getPusherBeamsSettings();
  if (!settings) {
    return null;
  }
  return new PushNotifications({
    instanceId: settings.instanceId,
    secretKey: settings.secretKey,
  });
}

/** Whether Pusher Beams push is configured for this instance. */
export async function isPushConfigured(): Promise<boolean> {
  return (await getPusherBeamsSettings()) !== null;
}

/** Beams device-association token for a user. The HS256 JWT is built by hand
 * rather than via `client.generateToken()` purely to back-date `iat`: the SDK
 * stamps it from the local clock, and a few seconds' drift ahead of Pusher gets
 * the token rejected as "Token used before issued". Claims are otherwise identical. */
export async function generateBeamsToken(
  userId: string
): Promise<{ token: string } | null> {
  const settings = await getPusherBeamsSettings();
  if (!settings || !userId) {
    return null;
  }
  const { instanceId, secretKey } = settings;

  const now = Math.floor(Date.now() / 1000);
  const iat = now - CLOCK_SKEW_LEEWAY_SECONDS;

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: userId,
    iss: `https://${instanceId}.pushnotifications.pusher.com`,
    iat,
    exp: iat + TOKEN_TTL_SECONDS,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload)
  )}`;
  const signature = base64url(
    createHmac("sha256", secretKey).update(signingInput).digest()
  );

  return { token: `${signingInput}.${signature}` };
}

/** Send a browser/OS push to the given users. No-op when Beams isn't configured.
 * Best-effort: never throws to the caller (who should still `.catch`). */
export async function publishPushToUsers(
  userIds: string[],
  data: { title: string; body: string; deepLink?: string }
): Promise<void> {
  const c = await getClient();
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!c || ids.length === 0) {
    return;
  }

  await c.publishToUsers(ids, {
    web: {
      notification: {
        title: data.title,
        body: data.body,
        deep_link: data.deepLink,
      },
    },
  });
}
