import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { user } from "@/db/schema/auth";
import { ticketReplyDrafts } from "@/db/schema/reply-drafts";
import { db } from "@/lib/db";

export interface ReplyDraft {
  content: string;
  isInternal: boolean;
  updatedAt: Date;
}

export async function getReplyDraft(
  ticketId: string,
  userId: string
): Promise<ReplyDraft | null> {
  const [row] = await db
    .select({
      content: ticketReplyDrafts.content,
      isInternal: ticketReplyDrafts.isInternal,
      updatedAt: ticketReplyDrafts.updatedAt,
    })
    .from(ticketReplyDrafts)
    .where(
      and(
        eq(ticketReplyDrafts.ticketId, ticketId),
        eq(ticketReplyDrafts.userId, userId)
      )
    )
    .limit(1);
  return row ?? null;
}

export interface ColleagueReplyDraft {
  authorName: string;
  content: string;
  isInternal: boolean;
  updatedAt: Date;
  userId: string;
}

/** Other agents' unsent drafts on a ticket, newest first. Shown read-only above
 * the composer; the owning agent's own row is never touched. */
export async function getColleagueReplyDrafts(
  ticketId: string,
  userId: string
): Promise<ColleagueReplyDraft[]> {
  return db
    .select({
      userId: ticketReplyDrafts.userId,
      authorName: user.name,
      content: ticketReplyDrafts.content,
      isInternal: ticketReplyDrafts.isInternal,
      updatedAt: ticketReplyDrafts.updatedAt,
    })
    .from(ticketReplyDrafts)
    .innerJoin(user, eq(user.id, ticketReplyDrafts.userId))
    .where(
      and(
        eq(ticketReplyDrafts.ticketId, ticketId),
        ne(ticketReplyDrafts.userId, userId)
      )
    )
    .orderBy(desc(ticketReplyDrafts.updatedAt));
}

export interface DraftMarkers {
  /** Tickets (out of the input) on which the caller has an unsent draft. */
  mine: Set<string>;
  /** ticketId -> distinct names of OTHER agents with a draft on it. */
  others: Map<string, string[]>;
}

/** Drives the draft markers on the /tickets list: the caller's own drafts and
 * which colleagues have one. */
export async function getDraftMarkers(
  ticketIds: string[],
  userId: string
): Promise<DraftMarkers> {
  const mine = new Set<string>();
  const others = new Map<string, string[]>();
  if (ticketIds.length === 0) {
    return { mine, others };
  }
  const rows = await db
    .select({
      ticketId: ticketReplyDrafts.ticketId,
      userId: ticketReplyDrafts.userId,
      authorName: user.name,
    })
    .from(ticketReplyDrafts)
    .innerJoin(user, eq(user.id, ticketReplyDrafts.userId))
    .where(inArray(ticketReplyDrafts.ticketId, ticketIds))
    .orderBy(ticketReplyDrafts.updatedAt);
  for (const r of rows) {
    if (r.userId === userId) {
      mine.add(r.ticketId);
      continue;
    }
    const names = others.get(r.ticketId) ?? [];
    if (!names.includes(r.authorName)) {
      names.push(r.authorName);
    }
    others.set(r.ticketId, names);
  }
  return { mine, others };
}

export async function deleteReplyDraft(ticketId: string, userId: string) {
  await db
    .delete(ticketReplyDrafts)
    .where(
      and(
        eq(ticketReplyDrafts.ticketId, ticketId),
        eq(ticketReplyDrafts.userId, userId)
      )
    );
}
