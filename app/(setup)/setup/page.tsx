import { redirect } from "next/navigation";
import { SetupWizard } from "@/app/(setup)/_components/setup-wizard";
import { getVerifiedSession } from "@/lib/authz";
import { hasAdminUser, isSetupComplete } from "@/lib/setup";

export const metadata = {
  title: "Set up",
};

// The setup check queries the database, which must happen per request — a
// build-time prerender either fails (no database in the Docker builder) or
// bakes a stale answer into static HTML.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Once the wizard has actually been finished (its last step called
  // POST /api/setup/finish), this page is done for good — send anyone who
  // lands here to the normal sign-in page.
  if (await isSetupComplete()) {
    redirect("/login");
  }

  // The admin account is created a step before the wizard finishes (during
  // the Account step). If it already exists here, the wizard's later,
  // client-only step state was lost — most likely a page reload while
  // sitting on the Integrations step. Resume there instead of restarting
  // account creation.
  if (await hasAdminUser()) {
    const session = await getVerifiedSession();
    if (!session) {
      // No way to resume the (session-gated) Integrations forms. Send them
      // to sign back in — they can finish integrations from Admin →
      // Integrations afterward.
      redirect("/login");
    }
    return <SetupWizard initialStep="integrations" />;
  }

  return <SetupWizard />;
}
