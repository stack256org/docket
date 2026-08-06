"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntegrationSettingsSummary } from "@/lib/integration-settings";
import { IntegrationCard } from "./integration-card";
import { SecretInput } from "./secret-input";

type PusherChannels = IntegrationSettingsSummary["pusherChannels"];

interface Props {
  collapsible?: boolean;
  defaultOpen?: boolean;
  initial: PusherChannels;
}

export function PusherChannelsSettingsForm({
  initial,
  collapsible,
  defaultOpen,
}: Props) {
  const [appId, setAppId] = useState(initial.appId);
  const [key, setKey] = useState(initial.key);
  const [secret, setSecret] = useState("");
  const [hasSecret, setHasSecret] = useState(initial.hasSecret);
  const [cluster, setCluster] = useState(initial.cluster);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const configured = !!(appId && key && cluster && hasSecret);

  async function patch(body: Record<string, unknown>, message: string) {
    const res = await fetch("/api/admin/integration-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pusherChannels: body }),
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
        { appId, key, cluster, secret: secret || undefined },
        "Pusher Channels settings saved."
      );
      if (ok) {
        if (secret) {
          setHasSecret(true);
        }
        setSecret("");
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
        { appId: "", key: "", cluster: "", secret: "" },
        "Pusher Channels settings removed."
      );
      if (ok) {
        setAppId("");
        setKey("");
        setCluster("");
        setSecret("");
        setHasSecret(false);
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
      description="Live ticket list and ticket-detail updates with no page refresh. A different Pusher product from Beams above — from dashboard.pusher.com → Channels."
      onRemove={remove}
      onSave={save}
      removing={removing}
      saving={saving}
      title="Real-Time Updates (Pusher Channels)"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="channels-app-id">App ID</Label>
          <Input
            disabled={saving}
            id="channels-app-id"
            onChange={(e) => setAppId(e.target.value)}
            value={appId}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="channels-cluster">Cluster</Label>
          <Input
            disabled={saving}
            id="channels-cluster"
            onChange={(e) => setCluster(e.target.value)}
            placeholder="us2"
            value={cluster}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="channels-key">Key</Label>
          <Input
            disabled={saving}
            id="channels-key"
            onChange={(e) => setKey(e.target.value)}
            value={key}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="channels-secret">Secret</Label>
          <SecretInput
            disabled={saving}
            hasSavedValue={hasSecret}
            id="channels-secret"
            onChange={setSecret}
            value={secret}
          />
        </div>
      </div>
    </IntegrationCard>
  );
}
