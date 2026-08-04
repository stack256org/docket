import { desc, eq } from "drizzle-orm";
import {
  AccountIdentityForms,
  DeleteAccountForm,
} from "@/components/profile/account-forms";
import { ExportDataCard } from "@/components/profile/export-data-card";
import { PasswordCard } from "@/components/profile/password-card";
import {
  type SessionRow,
  SessionsCard,
} from "@/components/profile/sessions-card";
import { account, session as sessionTable } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/settings";

export const metadata = { title: "Your Profile" };

// This page's queries need the CURRENT session's token (to flag it "Current"
// in the sessions list) — requireSession() hits the DB directly for that,
// unlike getSessionUser() which only reads identity out of middleware
// headers. See lib/authz.ts.
export default async function ProfilePage() {
  const current = await requireSession();

  const [sessions, accounts, settings] = await Promise.all([
    db
      .select({
        id: sessionTable.id,
        createdAt: sessionTable.createdAt,
        expiresAt: sessionTable.expiresAt,
        ipAddress: sessionTable.ipAddress,
        userAgent: sessionTable.userAgent,
        token: sessionTable.token,
      })
      .from(sessionTable)
      .where(eq(sessionTable.userId, current.user.id))
      .orderBy(desc(sessionTable.createdAt)),
    db
      .select({ providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, current.user.id)),
    getPlatformSettings(),
  ]);

  const sessionRows: SessionRow[] = sessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    isCurrent: s.token === current.session.token,
  }));

  const hasPassword = accounts.some((a) => a.providerId === "credential");

  // Page title + description come from the TopBar (components/agent/topbar.tsx).
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <AccountIdentityForms
        email={current.user.email}
        name={current.user.name}
      />

      {settings.passwordLoginEnabled && (
        <PasswordCard hasPassword={hasPassword} />
      )}

      <SessionsCard sessions={sessionRows} />

      <ExportDataCard />

      <DeleteAccountForm email={current.user.email} />
    </div>
  );
}
