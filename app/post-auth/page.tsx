import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ADMIN_ROLE, AGENT_ROLE } from "@/config/platform";
import { user } from "@/db/schema";
import { getVerifiedSession } from "@/lib/authz";
import { db } from "@/lib/db";

// This page is pure routing logic, so every exit must be a *terminal*
// destination for the state that sent us there. Bouncing a broken session back
// to /login is not terminal — /login's own "already signed in" guard sends it
// straight back here. Broken sessions go to /api/session-reset instead, which
// can clear the cookies (a page cannot) before landing on /login.
export const dynamic = "force-dynamic";

export default async function PostAuthPage() {
  // Getting here without a real session means the browser is holding cookies
  // that no longer resolve to anything. Clear them instead of redirecting to
  // /login, so they can't keep satisfying the cookie-cache read that the proxy
  // still does on every protected route.
  const session = await getVerifiedSession();
  if (!session) {
    redirect("/api/session-reset");
  }

  const [freshUser] = await db
    .select({ role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  // Session survives but its user doesn't, or they were banned out of band —
  // there is nothing to sign in as. Clear the cookies rather than redirecting
  // into a loop.
  if (!freshUser || freshUser.banned) {
    redirect("/api/session-reset");
  }

  if (freshUser.role === ADMIN_ROLE) {
    redirect("/tickets");
  }
  if (freshUser.role === AGENT_ROLE) {
    redirect("/tickets");
  }

  // No role assigned yet — show a pending access page
  redirect("/unauthorized");
}
