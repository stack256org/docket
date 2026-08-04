import { NextResponse } from "next/server";
import { dbClient } from "@/lib/db";

// Liveness/readiness probe for container orchestrators, load balancers, and
// uptime monitors. Deliberately unauthenticated (it is not in proxy.ts's
// matcher) — a healthcheck that needs a session is useless to Docker.
//
// It reports only "can this process still reach its database", never version
// details of the DB, connection strings, or error text. An unauthenticated
// endpoint is an unauthenticated endpoint; the reason for a failure goes to the
// server log, not the response body.
export const dynamic = "force-dynamic";

const VERSION = process.env.APP_VERSION ?? "dev";

export async function GET() {
  try {
    await dbClient`select 1`;
  } catch (error) {
    console.error("[health] database check failed", error);
    return NextResponse.json(
      { status: "error", database: "unreachable", version: VERSION },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    database: "ok",
    version: VERSION,
  });
}
