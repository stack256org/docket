import { createHmac } from "node:crypto";
import PushNotifications from "@pusher/push-notifications-server";

const instanceId = process.env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID;
const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY;

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

let client: PushNotifications | null = null;

function getClient(): PushNotifications | null {
  if (client) {
    return client;
  }
  if (!instanceId || !secretKey) {
    return null;
  }
  client = new PushNotifications({ instanceId, secretKey });
  return client;
}

/** Whether Pusher Beams push is configured for this instance. */
export function isPushConfigured(): boolean {
  return Boolean(instanceId && secretKey);
}

/**
 * Beams device-association token for a user (used by the client token provider).
 *
 * We build the HS256 JWT ourselves instead of using `client.generateToken()` so
 * that we can back-date `iat` by a small leeway. The SDK stamps `iat` with the
 * local clock; if that clock is even a few seconds ahead of Pusher's servers the
 * token is rejected with "Token used before issued". The signed claims otherwise
 * match what the Beams SDK produces.
 */
export function generateBeamsToken(userId: string): { token: string } | null {
  if (!(instanceId && secretKey) || !userId) {
    return null;
  }

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

/**
 * Send a browser/OS push to the given users. No-op when Beams isn't configured.
 * Best-effort: never throws to the caller (callers should still `.catch`).
 */
export async function publishPushToUsers(
  userIds: string[],
  data: { title: string; body: string; deepLink?: string }
): Promise<void> {
  const c = getClient();
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
