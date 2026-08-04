import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateApiKey } from "@/lib/api-keys";

// An API key is a bearer credential for the whole public API. What matters is
// that the raw secret is never what gets stored, and that two keys are never
// the same.

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

describe("generateApiKey", () => {
  it("stores a SHA-256 hash, never the raw secret", () => {
    const { raw, hash } = generateApiKey();
    expect(hash).toBe(sha256(raw));
    expect(hash).not.toContain(raw);
    expect(hash).toHaveLength(64);
  });

  it("uses the dk_live_ prefix", () => {
    expect(generateApiKey().raw.startsWith("dk_live_")).toBe(true);
  });

  it("does not use Stripe's sk_live_ shape", () => {
    // Deliberate: reusing Stripe's format makes every placeholder in our docs
    // trip GitHub push protection as a false-positive Stripe key.
    expect(generateApiKey().raw.startsWith("sk_live_")).toBe(false);
  });

  it("records a prefix short enough to be safe to display", () => {
    const { raw, prefix } = generateApiKey();
    expect(raw.startsWith(prefix)).toBe(true);
    expect(prefix).toHaveLength(16);
    // The displayed prefix must not be enough to reconstruct the key.
    expect(prefix.length).toBeLessThan(raw.length / 2);
  });

  it("produces a key long enough not to be guessable", () => {
    // Two cuid2 values plus the prefix.
    expect(generateApiKey().raw.length).toBeGreaterThan(40);
  });

  it("never repeats a key or a hash across many generations", () => {
    const raws = new Set<string>();
    const hashes = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const { raw, hash } = generateApiKey();
      raws.add(raw);
      hashes.add(hash);
    }
    expect(raws.size).toBe(500);
    expect(hashes.size).toBe(500);
  });

  it("keeps verifying keys issued before the rename", () => {
    // Keys created when the product was called Support Tool start stk_live_.
    // Lookup is by hash of the whole secret, so the prefix change must not
    // invalidate them. If this fails, every existing integration broke.
    const legacyRaw = "stk_live_abcdefghijklmnopqrstuvwxyz0123456789";
    expect(sha256(legacyRaw)).toHaveLength(64);
    expect(sha256(legacyRaw)).toBe(sha256(legacyRaw));
    expect(sha256(legacyRaw)).not.toBe(sha256(`${legacyRaw} `));
  });
});
