import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// Stateless, signed access token that grants a customer a view of *all* tickets
// belonging to their email address (the "My Tickets" list page). Unlike the
// per-ticket `customerToken`, this is scoped to an email and carries an expiry,
// so leaked links stop working after `MY_TICKETS_TOKEN_TTL_SECONDS`.
//
// Format: base64url(payload) + "." + base64url(hmacSHA256(payload))
// where payload = `${emailLower}:${expEpochSeconds}`.

const MY_TICKETS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string): string {
  return base64url(
    createHmac("sha256", env.APP_SECRET).update(payload).digest()
  );
}

/** Issue a signed "My Tickets" token for the given email. */
export function signEmailToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const exp = Math.floor(Date.now() / 1000) + MY_TICKETS_TOKEN_TTL_SECONDS;
  const payload = `${normalized}:${exp}`;
  return `${base64url(payload)}.${sign(payload)}`;
}

/**
 * Verify a "My Tickets" token. Returns the normalized email on success, or
 * `null` if the token is malformed, tampered with, or expired.
 */
export function verifyEmailToken(token: string): string | null {
  if (!token?.includes(".")) {
    return null;
  }

  const [encodedPayload, providedSig] = token.split(".");
  if (!encodedPayload || !providedSig) {
    return null;
  }

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expectedSig = sign(payload);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  const sep = payload.lastIndexOf(":");
  if (sep === -1) {
    return null;
  }
  const email = payload.slice(0, sep);
  const exp = Number(payload.slice(sep + 1));
  if (!email || !Number.isFinite(exp)) {
    return null;
  }
  if (exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return email;
}
