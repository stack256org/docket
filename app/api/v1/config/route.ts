import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { getCustomFields } from "@/lib/custom-fields";
import { searchTags } from "@/lib/tags";
import {
  getTicketCategories,
  getTicketPriorities,
  getTicketStatuses,
} from "@/lib/ticket-config";

// GET /api/v1/config — the valid category/priority/status slugs, so integrators
// can build a ticket form without hardcoding slugs that break silently when an
// admin renames them. Arrays come pre-sorted in the display order agents see;
// `tags` is the shared pool, alphabetical, since tags have no defined order.
export async function GET(request: NextRequest) {
  try {
    await requireApiKey(request);
  } catch (e) {
    return e as Response;
  }

  const [categories, priorities, statuses, customFields, tags] =
    await Promise.all([
      getTicketCategories(),
      getTicketPriorities(),
      getTicketStatuses(),
      getCustomFields(),
      searchTags("", Number.MAX_SAFE_INTEGER),
    ]);

  return NextResponse.json({
    categories: categories.map((c) => ({
      slug: c.slug,
      label: c.label,
      color: c.color,
    })),
    priorities: priorities.map((p) => ({
      slug: p.slug,
      label: p.label,
      color: p.color,
      isDefault: p.isDefault,
    })),
    statuses: statuses.map((s) => ({
      slug: s.slug,
      label: s.label,
      color: s.color,
      isDefault: s.isDefault,
      isClosedState: s.isClosedState,
    })),
    customFields: customFields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      options: f.options ?? undefined,
      required: f.required,
    })),
    tags: tags.map((t) => ({ id: t.id, name: t.name })),
  });
}
