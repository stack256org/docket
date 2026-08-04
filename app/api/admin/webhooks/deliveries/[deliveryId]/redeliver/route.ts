import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/authz";
import { redeliverWebhookDelivery } from "@/lib/webhooks/service";

// POST /api/admin/webhooks/deliveries/:deliveryId/redeliver — re-enqueues a
// failed delivery from scratch (fresh attempt count).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  try {
    requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  const { deliveryId } = await params;
  const ok = await redeliverWebhookDelivery(deliveryId);
  if (!ok) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
