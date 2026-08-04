import { createId } from "@paralleldrive/cuid2";
import { storage } from "@/lib/storage";

// Attachment rules for the public API (app/api/v1/*). Kept identical to the
// customer portal's own limits (app/api/tickets/route.ts and
// app/api/tickets/[id]/comments/route.ts) so a ticket created or replied to
// through the API can never hold a file the portal would have rejected.
export const API_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/zip",
  "text/plain",
]);
export const API_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const API_MAX_ATTACHMENTS_PER_TICKET = 5;

// Attachments arrive over JSON as base64 (the integrator's server already
// holds the bytes and posts JSON, not multipart) — see docs/api.md.
export interface Base64AttachmentInput {
  data?: string;
  filename?: string;
  mimeType?: string;
}

export interface DecodedAttachment {
  buffer: Buffer;
  filename: string;
  fileSize: number;
  mimeType: string;
}

export type DecodeResult =
  | { ok: true; attachments: DecodedAttachment[] }
  | { ok: false; error: string };

/**
 * Validate + decode a base64 attachment array from a JSON request body.
 * `remainingSlots` is how many more files this ticket may still hold (5 minus
 * what it already has), so the API enforces the same per-ticket cap the portal
 * does. Pure — no I/O — so callers can validate before touching storage.
 */
export function decodeBase64Attachments(
  raw: unknown,
  remainingSlots: number
): DecodeResult {
  if (raw === undefined || raw === null) {
    return { ok: true, attachments: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: "attachments must be an array." };
  }
  if (raw.length === 0) {
    return { ok: true, attachments: [] };
  }
  if (raw.length > remainingSlots) {
    return {
      ok: false,
      error: `Only ${remainingSlots} more attachment(s) allowed on this ticket.`,
    };
  }

  const attachments: DecodedAttachment[] = [];
  for (const item of raw as Base64AttachmentInput[]) {
    const filename = String(item?.filename ?? "").trim();
    const mimeType = String(item?.mimeType ?? "").trim();
    const data = String(item?.data ?? "");

    if (!filename) {
      return { ok: false, error: "Each attachment needs a filename." };
    }
    if (!API_ALLOWED_MIME_TYPES.has(mimeType)) {
      return {
        ok: false,
        error: `File type "${mimeType || "unknown"}" is not allowed.`,
      };
    }
    if (!data) {
      return { ok: false, error: `"${filename}" has no data.` };
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(data, "base64");
    } catch {
      return { ok: false, error: `"${filename}" is not valid base64.` };
    }
    if (buffer.length === 0) {
      return { ok: false, error: `"${filename}" is empty.` };
    }
    if (buffer.length > API_MAX_FILE_SIZE) {
      return { ok: false, error: `"${filename}" exceeds the 10 MB limit.` };
    }

    attachments.push({
      filename,
      buffer,
      fileSize: buffer.length,
      mimeType,
    });
  }

  return { ok: true, attachments };
}

export interface UploadedAttachment {
  filename: string;
  fileSize: number;
  id: string;
  mimeType: string;
  storageKey: string;
}

/**
 * Upload decoded attachments to storage under this ticket's prefix. Returns the
 * DB-ready rows (matching the portal's `tickets/{id}/{cuid}.{ext}` key layout).
 * On any failure it rolls back everything already uploaded, then rethrows —
 * the caller does its DB writes after this resolves.
 */
export async function uploadDecodedAttachments(
  ticketId: string,
  attachments: DecodedAttachment[]
): Promise<UploadedAttachment[]> {
  const uploaded: UploadedAttachment[] = [];
  try {
    for (const a of attachments) {
      const ext = a.filename.split(".").pop() ?? "bin";
      const storageKey = `tickets/${ticketId}/${createId()}.${ext}`;
      await storage.upload(storageKey, a.buffer, a.mimeType);
      uploaded.push({
        id: createId(),
        filename: a.filename,
        storageKey,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
      });
    }
  } catch (err) {
    for (const u of uploaded) {
      await storage.delete(u.storageKey).catch(() => undefined);
    }
    throw err;
  }
  return uploaded;
}
