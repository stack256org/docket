import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ADMIN_ROLE } from "@/config/platform";
import { platformSettings } from "@/db/schema/settings";
import { getVerifiedSession } from "@/lib/authz";
import { db } from "@/lib/db";

// POST — marks the setup wizard as actually finished, called only from the
// wizard's last step ("Continue to dashboard"). Until this is called,
// `/setup` treats the wizard as unfinished and resumes it (at the
// Integrations step) instead of redirecting away, even though the admin
// account already exists — see `lib/setup.ts`.
export async function POST() {
  const session = await getVerifiedSession();
  const role = (session?.user.role as string | undefined) ?? "";
  if (!session || role !== ADMIN_ROLE) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await db
    .update(platformSettings)
    .set({ setupCompletedAt: new Date() })
    .where(eq(platformSettings.id, "default"));

  return NextResponse.json({ ok: true });
}
