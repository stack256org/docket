import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ticketAttachments } from "@/db/schema";
import { requireApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

// GET /api/v1/tickets/:id/attachments/:attachmentId — public API, authenticated
// with an API key. Streams a ticket attachment's bytes so an integrating
// backend can proxy the download to its own users without exposing storage
// keys. The attachment must belong to the ticket in the path.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    await requireApiKey(request);
  } catch (e) {
    return e as Response;
  }

  const { id: ticketId, attachmentId } = await params;

  const [attachment] = await db
    .select({
      filename: ticketAttachments.filename,
      storageKey: ticketAttachments.storageKey,
      mimeType: ticketAttachments.mimeType,
    })
    .from(ticketAttachments)
    .where(
      and(
        eq(ticketAttachments.id, attachmentId),
        eq(ticketAttachments.ticketId, ticketId)
      )
    )
    .limit(1);

  if (!attachment) {
    return NextResponse.json(
      { error: "Attachment not found." },
      { status: 404 }
    );
  }

  let buffer: Buffer;
  try {
    buffer = await storage.download(attachment.storageKey);
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${attachment.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
