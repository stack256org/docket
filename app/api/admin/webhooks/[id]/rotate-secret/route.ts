import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { requireAdminFromRequest } from "@/lib/authz";
import { rotateWebhookSecret } from "@/lib/webhooks/service";

// POST /api/admin/webhooks/:id/rotate-secret — generates a new signing
// secret and returns it once. This is the only way to see a secret value
// after the endpoint's initial creation.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin: { id: string; email: string };
  try {
    admin = requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const result = await rotateWebhookSecret(id);
  if (!result) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await audit({
    action: "webhook.secret_rotated",
    actorId: admin.id,
    actorEmail: admin.email,
    description: `Rotated signing secret for webhook endpoint "${result.endpoint.name}"`,
    entityType: "webhook_endpoint",
    entityId: id,
  });

  return NextResponse.json({
    ...result.endpoint,
    rawSecret: result.rawSecret,
  });
}
