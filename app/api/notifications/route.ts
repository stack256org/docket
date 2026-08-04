import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/authz";
import { getUnreadCount, listNotifications } from "@/lib/notifications";

// GET /api/notifications — current agent's recent notifications + unread count.
export async function GET(request: NextRequest) {
  const me = getSessionUserFromRequest(request);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [items, unreadCount] = await Promise.all([
    listNotifications(me.id),
    getUnreadCount(me.id),
  ]);

  return NextResponse.json({ items, unreadCount });
}
