import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ADMIN_ROLE, AGENT_ROLE } from "@/config/platform";
import { userTicketTablePrefs } from "@/db/schema/user-preferences";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type ColumnPref,
  CUSTOMIZABLE_COLUMNS,
} from "@/lib/tickets-table-columns";

const KNOWN_IDS = new Set<string>(CUSTOMIZABLE_COLUMNS.map((c) => c.id));

// /api/tickets/* is not covered by the proxy.ts middleware matcher, so we
// check the session directly here (same pattern as app/api/tickets/[id]/route.ts
// and app/api/tickets/bulk/route.ts) instead of the header-based
// requireAgentFromRequest helper, which only works for matcher-covered paths.
async function requireAgentSession(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return null;
  }
  if (session.user.role !== AGENT_ROLE && session.user.role !== ADMIN_ROLE) {
    return null;
  }
  return session;
}

function isValidColumns(value: unknown): value is ColumnPref[] {
  if (!Array.isArray(value) || value.length !== CUSTOMIZABLE_COLUMNS.length) {
    return false;
  }
  const seen = new Set<string>();
  for (const entry of value) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as { id?: unknown }).id !== "string" ||
      typeof (entry as { visible?: unknown }).visible !== "boolean" ||
      !KNOWN_IDS.has((entry as { id: string }).id) ||
      seen.has((entry as { id: string }).id)
    ) {
      return false;
    }
    seen.add((entry as { id: string }).id);
  }
  return true;
}

// PATCH — save the caller's own /tickets column layout (visibility + order).
export async function PATCH(request: NextRequest) {
  const session = await requireAgentSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { columns?: unknown };
  try {
    body = (await request.json()) as { columns?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isValidColumns(body.columns)) {
    return NextResponse.json(
      { error: "Invalid column preferences." },
      { status: 400 }
    );
  }

  const now = new Date();
  await db
    .insert(userTicketTablePrefs)
    .values({ userId: session.user.id, columns: body.columns, updatedAt: now })
    .onConflictDoUpdate({
      target: userTicketTablePrefs.userId,
      set: { columns: body.columns, updatedAt: now },
    });

  return NextResponse.json({ columns: body.columns });
}
