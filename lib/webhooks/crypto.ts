import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { env } from "@/lib/env";

const ALGO = "aes-256-gcm";

// Derives a 32-byte key from the app-wide APP_SECRET (already used elsewhere
// in this app as the general-purpose secret — see lib/env.ts) rather than
// requiring a dedicated env var for this one feature.
function getKey(): Buffer {
  return createHash("sha256").update(env.APP_SECRET).digest();
}

/** Encrypts a webhook signing secret for storage in `webhook_endpoints.secret_encrypted`. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("hex")).join(":");
}

/** Reverses encryptSecret() — used only by the delivery worker to sign outgoing requests. */
export function decryptSecret(encrypted: string): string {
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** A new raw signing secret, shown to the admin exactly once (at creation or rotation). */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

/**
 * The signature sent as `X-Docket-Signature: sha256=<hex>` on every delivery.
 *
 * The timestamp is inside the signed material on purpose. Signing the body
 * alone would let anyone who captured one delivery replay it forever, so
 * receivers are told to reject anything more than a few minutes old (see
 * docs/webhooks.md). Changing what goes in here, or the order it goes in,
 * silently breaks every receiver that has already implemented verification.
 */
export function signWebhookPayload(
  secret: string,
  timestampSeconds: number,
  body: string
): string {
  return createHmac("sha256", secret)
    .update(`${timestampSeconds}.${body}`)
    .digest("hex");
}
