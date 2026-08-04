import { count, gte, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { tickets } from "@/db/schema";
import { db } from "@/lib/db";

// GET — agent/admin can read (middleware already enforced access)
export async function GET(request: NextRequest) {
  const days = Math.min(
    30,
    Math.max(
      7,
      Number.parseInt(new URL(request.url).searchParams.get("days") ?? "7", 10)
    )
  );

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date: sql<string>`DATE(${tickets.createdAt})::text`,
      count: count(),
    })
    .from(tickets)
    .where(gte(tickets.createdAt, since))
    .groupBy(sql`DATE(${tickets.createdAt})`)
    .orderBy(sql`DATE(${tickets.createdAt})`);

  // Build full date range with zeros filled in
  const countMap = new Map(rows.map((r) => [r.date, Number(r.count)]));
  const result: { date: string; count: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: countMap.get(key) ?? 0 });
  }

  return NextResponse.json({ days: result });
}
