import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { platformSettings } from "@/db/schema/settings";
import { requireAdminFromRequest } from "@/lib/authz";
import { db } from "@/lib/db";
import { resolveLogoUrl } from "@/lib/settings";
import { storage } from "@/lib/storage";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// POST /api/admin/settings/logo-dark — admin only. Uploads a new dark-background logo, replacing
// (and deleting) any previous one.
export async function POST(request: NextRequest) {
  try {
    requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const file = formData.get("logoDark");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const ext = ALLOWED_MIME_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      {
        error: "Dark-background logo must be a PNG, JPEG, SVG, or WebP image.",
      },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Dark-background logo must be 2 MB or smaller." },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select({ logoDarkKey: platformSettings.logoDarkKey })
    .from(platformSettings)
    .where(eq(platformSettings.id, "default"))
    .limit(1);

  const key = `branding/logo-dark-${createId()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await storage.upload(key, buffer, file.type);

  const now = new Date();
  await db
    .insert(platformSettings)
    .values({ id: "default", logoDarkKey: key, updatedAt: now })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: { logoDarkKey: key, updatedAt: now },
    });

  if (existing?.logoDarkKey) {
    await storage.delete(existing.logoDarkKey).catch(() => undefined);
  }

  return NextResponse.json({ logoDarkUrl: resolveLogoUrl(key) });
}

// DELETE /api/admin/settings/logo-dark — admin only. Clears the dark-background logo, so the
// sidebar falls back to the main logo.
export async function DELETE(request: NextRequest) {
  try {
    requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  const [existing] = await db
    .select({ logoDarkKey: platformSettings.logoDarkKey })
    .from(platformSettings)
    .where(eq(platformSettings.id, "default"))
    .limit(1);

  const now = new Date();
  await db
    .insert(platformSettings)
    .values({ id: "default", logoDarkKey: null, updatedAt: now })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: { logoDarkKey: null, updatedAt: now },
    });

  if (existing?.logoDarkKey) {
    await storage.delete(existing.logoDarkKey).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
