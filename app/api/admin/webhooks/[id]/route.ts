import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { requireAdminFromRequest } from "@/lib/authz";
import {
  deleteWebhookEndpoint,
  updateWebhookEndpoint,
} from "@/lib/webhooks/service";

// PATCH /api/admin/webhooks/:id — partial update. Never touches the secret.
export async function PATCH(
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

  let body: {
    name?: string;
    url?: string;
    events?: unknown;
    isActive?: boolean;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const updates: {
    name?: string;
    url?: string;
    events?: unknown;
    isActive?: boolean;
  } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 2–100 characters." },
        { status: 400 }
      );
    }
    updates.name = name;
  }
  if (body.url !== undefined) {
    const url = body.url.trim();
    if (!url || !isValidHttpUrl(url)) {
      return NextResponse.json(
        { error: "URL must be a valid http(s) address." },
        { status: 400 }
      );
    }
    updates.url = url;
  }
  if (body.events !== undefined) {
    if (!(Array.isArray(body.events) && body.events.length > 0)) {
      return NextResponse.json(
        { error: "Select at least one event." },
        { status: 400 }
      );
    }
    updates.events = body.events;
  }
  if (body.isActive !== undefined) {
    updates.isActive = body.isActive;
  }

  const updated = await updateWebhookEndpoint(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await audit({
    action: "webhook.updated",
    actorId: admin.id,
    actorEmail: admin.email,
    description: `Updated webhook endpoint "${updated.name}"`,
    entityType: "webhook_endpoint",
    entityId: id,
    metadata: updates,
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/webhooks/:id — hard delete, cascades to delivery history.
export async function DELETE(
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
  const deleted = await deleteWebhookEndpoint(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await audit({
    action: "webhook.deleted",
    actorId: admin.id,
    actorEmail: admin.email,
    description: "Deleted webhook endpoint",
    entityType: "webhook_endpoint",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
