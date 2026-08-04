import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { requireAdminFromRequest } from "@/lib/authz";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
} from "@/lib/webhooks/service";

// GET /api/admin/webhooks — list endpoints (never returns the secret)
export async function GET(request: NextRequest) {
  try {
    requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  const endpoints = await listWebhookEndpoints();
  return NextResponse.json(endpoints);
}

// POST /api/admin/webhooks — create an endpoint. The raw signing secret is
// returned once, in this response only — never retrievable again (only
// rotation produces a new one-time value).
export async function POST(request: NextRequest) {
  let admin: { id: string; name: string; email: string };
  try {
    admin = requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  let body: { name?: string; url?: string; events?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const name = body.name?.trim();
  if (!name || name.length < 2 || name.length > 100) {
    return NextResponse.json(
      { error: "Name must be 2–100 characters." },
      { status: 400 }
    );
  }

  const url = body.url?.trim();
  if (!url || !isValidHttpUrl(url)) {
    return NextResponse.json(
      { error: "URL must be a valid http(s) address." },
      { status: 400 }
    );
  }

  if (!(Array.isArray(body.events) && body.events.length > 0)) {
    return NextResponse.json(
      { error: "Select at least one event." },
      { status: 400 }
    );
  }

  const { endpoint, rawSecret } = await createWebhookEndpoint({
    name,
    url,
    events: body.events,
    createdById: admin.id,
    createdByName: admin.name,
  });

  await audit({
    action: "webhook.created",
    actorId: admin.id,
    actorEmail: admin.email,
    description: `Created webhook endpoint "${name}"`,
    entityType: "webhook_endpoint",
    entityId: endpoint.id,
    metadata: { url, events: endpoint.events },
  });

  return NextResponse.json({ ...endpoint, rawSecret }, { status: 201 });
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
