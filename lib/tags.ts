import { createId } from "@paralleldrive/cuid2";
import { asc, eq, ilike, inArray } from "drizzle-orm";
import { tags, ticketTags } from "@/db/schema";
import { db } from "@/lib/db";

export type Tag = typeof tags.$inferSelect;

/** Trim + collapse whitespace + lowercase, so "Billing" and "billing " share one row. */
export function normalizeTagName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Find-or-create a tag by (normalized) name — the shared pool any agent adds to. */
export async function getOrCreateTagId(rawName: string): Promise<string> {
  const name = normalizeTagName(rawName);
  const [existing] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);
  if (existing) {
    return existing.id;
  }
  try {
    const [created] = await db
      .insert(tags)
      .values({ id: createId(), name })
      .returning({ id: tags.id });
    return created.id;
  } catch {
    // Unique-violation race — another request created it first.
    const [row] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.name, name))
      .limit(1);
    if (!row) {
      throw new Error(`Failed to resolve tag "${name}".`);
    }
    return row.id;
  }
}

/**
 * Find-or-create each tag name and link it to the ticket. Idempotent — a tag
 * already linked to the ticket is skipped (the unique (ticketId, tagId) index
 * makes the insert a no-op via onConflictDoNothing). Names are normalized and
 * deduped first. Used by the public create API so an integrating backend can
 * tag a ticket at creation time, exactly like an agent adding tags by hand.
 */
export async function linkTagsToTicket(
  ticketId: string,
  rawNames: string[]
): Promise<void> {
  const names = Array.from(
    new Set(rawNames.map(normalizeTagName).filter((n) => n.length > 0))
  );
  if (names.length === 0) {
    return;
  }
  for (const name of names) {
    const tagId = await getOrCreateTagId(name);
    await db
      .insert(ticketTags)
      .values({ id: createId(), ticketId, tagId })
      .onConflictDoNothing();
  }
}

export async function getTicketTags(
  ticketId: string
): Promise<Array<{ id: string; name: string }>> {
  return db
    .select({ id: tags.id, name: tags.name })
    .from(ticketTags)
    .innerJoin(tags, eq(ticketTags.tagId, tags.id))
    .where(eq(ticketTags.ticketId, ticketId))
    .orderBy(asc(tags.name));
}

/** Bulk sibling of getTicketTags — for rendering a Tags column across a page of tickets. */
export async function getTicketTagsForTickets(
  ticketIds: string[]
): Promise<Record<string, string[]>> {
  if (ticketIds.length === 0) {
    return {};
  }
  const rows = await db
    .select({ ticketId: ticketTags.ticketId, name: tags.name })
    .from(ticketTags)
    .innerJoin(tags, eq(ticketTags.tagId, tags.id))
    .where(inArray(ticketTags.ticketId, ticketIds))
    .orderBy(asc(tags.name));

  const byTicket: Record<string, string[]> = {};
  for (const row of rows) {
    if (!byTicket[row.ticketId]) {
      byTicket[row.ticketId] = [];
    }
    byTicket[row.ticketId].push(row.name);
  }
  return byTicket;
}

/** Autocomplete search across the shared tag pool. */
export async function searchTags(query: string, limit = 20): Promise<Tag[]> {
  const q = query.trim();
  const rows = await db
    .select()
    .from(tags)
    .where(q ? ilike(tags.name, `%${normalizeTagName(q)}%`) : undefined)
    .orderBy(asc(tags.name))
    .limit(limit);
  return rows;
}
