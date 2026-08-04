import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/authz";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";

// POST /api/notifications/read — mark one notification read ({ id }) or all (no body).
export async function POST(request: NextRequest) {
  const me = getSessionUserFromRequest(request);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { id?: string } = {};
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    // empty body → mark all read
  }

  if (body.id) {
    await markNotificationRead(me.id, body.id);
  } else {
    await markAllNotificationsRead(me.id);
  }

  return NextResponse.json({ ok: true });
}
