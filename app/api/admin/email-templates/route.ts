import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  EMAIL_TEMPLATE_TYPES,
  getAllEmailTemplates,
} from "@/lib/email-templates";

// GET — agent/admin can read (middleware already enforced access). Returns
// all 4 customizable types with their metadata (label, merge tags, default
// subject) plus whatever custom subject/body an admin has already saved.
export async function GET(_request: NextRequest) {
  const rows = await getAllEmailTemplates();

  return NextResponse.json(
    EMAIL_TEMPLATE_TYPES.map((meta) => ({
      type: meta.type,
      label: meta.label,
      description: meta.description,
      defaultSubject: meta.defaultSubject,
      mergeTags: meta.mergeTags,
      subject: rows[meta.type]?.subject ?? null,
      body: rows[meta.type]?.body ?? null,
    }))
  );
}
