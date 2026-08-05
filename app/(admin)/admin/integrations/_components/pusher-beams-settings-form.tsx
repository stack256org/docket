"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntegrationSettingsSummary } from "@/lib/integration-settings";
import { IntegrationCard } from "./integration-card";
import { SecretInput } from "./secret-input";

type PusherBeams = IntegrationSettingsSummary["pusherBeams"];

interface Props {
  collapsible?: boolean;
  defaultOpen?: boolean;
  initial: PusherBeams;
}

export function PusherBeamsSettingsForm({
  initial,
  collapsible,
  defaultOpen,
}: Props) {
  const [instanceId, setInstanceId] = useState(initial.instanceId);
  const [secretKey, setSecretKey] = useState("");
  const [hasSecretKey, setHasSecretKey] = useState(initial.hasSecretKey);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const configured = !!(instanceId && hasSecretKey);

  async function patch(body: Record<string, unknown>, message: string) {
    const res = await fetch("/api/admin/integration-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pusherBeams: body }),
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
        { instanceId, secretKey: secretKey || undefined },
        "Pusher Beams settings saved."
      );
      if (ok) {
        if (secretKey) {
          setHasSecretKey(true);
        }
        setSecretKey("");
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
        { instanceId: "", secretKey: "" },
        "Pusher Beams settings removed."
      );
      if (ok) {
        setInstanceId("");
        setSecretKey("");
        setHasSecretKey(false);
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
      description="OS-level push to agents when a customer replies, even with the app closed. From dashboard.pusher.com → Beams."
      onRemove={remove}
      onSave={save}
      removing={removing}
      saving={saving}
      title="Push Notifications (Pusher Beams)"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="beams-instance-id">Instance ID</Label>
          <Input
            disabled={saving}
            id="beams-instance-id"
            onChange={(e) => setInstanceId(e.target.value)}
            value={instanceId}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="beams-secret-key">Secret Key</Label>
          <SecretInput
            disabled={saving}
            hasSavedValue={hasSecretKey}
            id="beams-secret-key"
            onChange={setSecretKey}
            value={secretKey}
          />
        </div>
      </div>
    </IntegrationCard>
  );
}
