import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/rate-limit";

// Rate limits on the public ticket form are keyed by this value. If it returns
// the same thing for everyone, one abuser locks out every customer; if it
// trusts the wrong part of the header, an abuser rotates it freely.

function requestWith(headers: Record<string, string>): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

describe("getClientIp", () => {
  it("reads x-forwarded-for", () => {
    expect(getClientIp(requestWith({ "x-forwarded-for": "203.0.113.7" }))).toBe(
      "203.0.113.7"
    );
  });

  it("takes the first entry in a proxy chain", () => {
    // Left-most is the original client; the rest are the proxies it passed
    // through. Keying on the last one would bucket every customer behind the
    // same CDN into a single limit.
    expect(
      getClientIp(
        requestWith({
          "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
        })
      )
    ).toBe("203.0.113.7");
  });

  it("trims surrounding whitespace", () => {
    expect(
      getClientIp(
        requestWith({ "x-forwarded-for": "  203.0.113.7 , 70.41.3.18" })
      )
    ).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(getClientIp(requestWith({ "x-real-ip": "198.51.100.4" }))).toBe(
      "198.51.100.4"
    );
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    expect(
      getClientIp(
        requestWith({
          "x-forwarded-for": "203.0.113.7",
          "x-real-ip": "198.51.100.4",
        })
      )
    ).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is empty or blank", () => {
    expect(
      getClientIp(
        requestWith({ "x-forwarded-for": "", "x-real-ip": "198.51.100.4" })
      )
    ).toBe("198.51.100.4");
    expect(
      getClientIp(
        requestWith({ "x-forwarded-for": "   ", "x-real-ip": "198.51.100.4" })
      )
    ).toBe("198.51.100.4");
  });

  it("returns a constant when nothing identifies the caller", () => {
    // Everyone shares one bucket in this case, which is the safe direction:
    // it over-limits rather than letting an unidentifiable caller through.
    expect(getClientIp(requestWith({}))).toBe("unknown");
  });

  it("handles IPv6", () => {
    expect(
      getClientIp(requestWith({ "x-forwarded-for": "2001:db8::1, 70.41.3.18" }))
    ).toBe("2001:db8::1");
  });
});
