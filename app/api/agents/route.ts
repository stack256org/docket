import { and, eq, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { user } from "@/db/schema/auth";
import { db } from "@/lib/db";

// GET — agent/admin can read (middleware already enforced access)
export async function GET(_request: NextRequest) {
  const agents = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
    .from(user)
    .where(
      and(
        or(eq(user.role, "agent"), eq(user.role, "admin")),
        eq(user.banned, false)
      )
    );

  return NextResponse.json(agents);
}
