import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/authz";
import { listWebhookDeliveries } from "@/lib/webhooks/service";

// GET /api/admin/webhooks/:id/deliveries — recent delivery attempts for one endpoint.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const deliveries = await listWebhookDeliveries(id);
  return NextResponse.json(deliveries);
}
