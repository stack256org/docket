import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/authz";
import { sendTestWebhookEvent } from "@/lib/webhooks/service";

// POST /api/admin/webhooks/:id/test — dispatches a synthetic ticket.created
// payload immediately, so an admin can verify their receiving server without
// waiting for real ticket traffic.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const ok = await sendTestWebhookEvent(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
