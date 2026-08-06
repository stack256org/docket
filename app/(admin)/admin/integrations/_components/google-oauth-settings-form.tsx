"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntegrationSettingsSummary } from "@/lib/integration-settings";
import { IntegrationCard } from "./integration-card";
import { SecretInput } from "./secret-input";

type Google = IntegrationSettingsSummary["google"];

const REDIRECT_URI_TEMPLATE = "{your_domain}/api/auth/callback/google";

interface Props {
  collapsible?: boolean;
  defaultOpen?: boolean;
  initial: Google;
}

export function GoogleOAuthSettingsForm({
  initial,
  collapsible,
  defaultOpen,
}: Props) {
  const [clientId, setClientId] = useState(initial.clientId);
  const [clientSecret, setClientSecret] = useState("");
  const [hasClientSecret, setHasClientSecret] = useState(
    initial.hasClientSecret
  );
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [copied, setCopied] = useState(false);

  const configured = !!(clientId && hasClientSecret);

  async function copyRedirectUri() {
    await navigator.clipboard.writeText(REDIRECT_URI_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function patch(body: Record<string, unknown>, message: string) {
    const res = await fetch("/api/admin/integration-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ google: body }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save.");
      return false;
    }
    toast.success(message);
    return true;
  }

  async function save() {
    setSaving(true);
    try {
      const ok = await patch(
        { clientId, clientSecret: clientSecret || undefined },
        "Google sign-in settings saved."
      );
      if (ok) {
        if (clientSecret) {
          setHasClientSecret(true);
        }
        setClientSecret("");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      const ok = await patch(
        { clientId: "", clientSecret: "" },
        "Google sign-in settings removed."
      );
      if (ok) {
        setClientId("");
        setClientSecret("");
        setHasClientSecret(false);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <IntegrationCard
      collapsible={collapsible}
      configured={configured}
      defaultOpen={defaultOpen}
      description='Enables the "Continue with Google" button on agent/admin sign-in.'
      note="Changes here take effect after the app restarts — this login page reads Google credentials once at server startup, not per request. In Docker: docker compose restart app."
      onRemove={remove}
      onSave={save}
      removing={removing}
      saving={saving}
      title="Google Sign-in"
    >
      <div className="space-y-1.5 mb-4">
        <Label>Authorized redirect URI</Label>
        <p className="text-xs text-muted-foreground">
          Add this URL to your Google Cloud OAuth client's "Authorized redirect
          URIs", with {"{your_domain}"} replaced by this app's URL — Google
          sign-in fails with a redirect_uri_mismatch error otherwise.
        </p>
        <div className="flex items-center gap-2 rounded-md border border-border bg-accent px-3 py-2">
          <code className="text-xs text-foreground break-all flex-1">
            {REDIRECT_URI_TEMPLATE}
          </code>
          <button
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={copyRedirectUri}
            type="button"
          >
            {copied ? (
              <CheckIcon className="size-4 text-green-600" />
            ) : (
              <CopyIcon className="size-4" />
            )}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="google-client-id">Client ID</Label>
          <Input
            disabled={saving}
            id="google-client-id"
            onChange={(e) => setClientId(e.target.value)}
            value={clientId}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="google-client-secret">Client Secret</Label>
          <SecretInput
            disabled={saving}
            hasSavedValue={hasClientSecret}
            id="google-client-secret"
            onChange={setClientSecret}
            value={clientSecret}
          />
        </div>
      </div>
    </IntegrationCard>
  );
}
