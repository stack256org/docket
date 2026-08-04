import { type NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/authz";

// Liveness probe for the caller's session, used by the agent shell's
// SessionGuard to notice an expiry while a tab sits open.
//
// It does no work of its own: the proxy has already resolved the session and
// answered 401 if there isn't one, so reaching this handler at all is the "yes"
// answer. Deliberately no body and no DB round-trip — this is polled.
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  if (!getSessionUserFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return new NextResponse(null, { status: 204 });
}
