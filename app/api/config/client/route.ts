import { NextResponse } from "next/server";
import { getPusherClientConfig } from "@/lib/integration-settings";

// GET /api/config/client — public, unauthenticated (not in proxy.ts's
// matcher, same as /api/health). Returns only public Pusher identifiers
// (never secrets) needed by the browser at runtime.
//
// Exists because NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER /
// NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID used to be read directly off
// `process.env.NEXT_PUBLIC_*`, which Next.js inlines into the browser bundle
// at *build* time — the whole reason docker-compose.build.yml exists as a
// separate "rebuild to change Pusher config" deploy path. Fetching them here
// instead lets the same published image pick up a DB-saved value (see
// lib/integration-settings.ts) with nothing more than a page refresh — see
// lib/pusher-browser.ts and components/agent/push-init.tsx.
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getPusherClientConfig();
  return NextResponse.json(config);
}
