import { ReplyComposerPreferencesCard } from "@/components/settings/reply-composer-preferences-card";
import { requireAgent } from "@/lib/authz";
import { getSendReplyOnEnterPref } from "@/lib/user-preferences";

export const metadata = { title: "Settings" };

// Personal (per-agent) preferences, as opposed to org-wide settings under
// /admin/*. New personal settings land here as additional cards.
export default async function SettingsPage() {
  const session = await requireAgent();
  const sendReplyOnEnter = await getSendReplyOnEnterPref(session.id);

  // Page title + description come from the TopBar (components/agent/topbar.tsx).
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <ReplyComposerPreferencesCard
        initialSendReplyOnEnter={sendReplyOnEnter}
      />
    </div>
  );
}
