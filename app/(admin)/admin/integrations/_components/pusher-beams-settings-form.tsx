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
  const [testing, setTesting] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState(initial.lastTestedAt);
  const [lastTestOk, setLastTestOk] = useState(initial.lastTestOk);
  const [lastTestError, setLastTestError] = useState(initial.lastTestError);

  const configured = !!(instanceId && hasSecretKey);

  async function patch(body: Record<string, unknown>, message: string) {
    const res = await fetch("/api/admin/integration-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pusherBeams: body }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      tested?: { pusherBeams?: { message: string; ok: boolean } };
    };
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save.");
      return null;
    }
    toast.success(message);
    return data;
  }

  async function save() {
    setSaving(true);
    try {
      const data = await patch(
        { instanceId, secretKey: secretKey || undefined },
        "Pusher Beams settings saved."
      );
      if (data) {
        if (secretKey) {
          setHasSecretKey(true);
        }
        setSecretKey("");
        const tested = data.tested?.pusherBeams;
        setLastTestedAt(tested ? new Date().toISOString() : null);
        setLastTestOk(tested ? tested.ok : null);
        setLastTestError(tested && !tested.ok ? tested.message : null);
        if (tested && !tested.ok) {
          toast.error(`Saved, but connection test failed: ${tested.message}`);
        }
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
      const data = await patch(
        { instanceId: "", secretKey: "" },
        "Pusher Beams settings removed."
      );
      if (data) {
        setInstanceId("");
        setSecretKey("");
        setHasSecretKey(false);
        setLastTestedAt(null);
        setLastTestOk(null);
        setLastTestError(null);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setRemoving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch(
        "/api/admin/integration-settings/pusher-beams/test",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instanceId,
            secretKey: secretKey || undefined,
          }),
        }
      );
      const result = (await res.json().catch(() => ({}))) as {
        message?: string;
        ok?: boolean;
      };
      const ok = res.ok && !!result.ok;
      setLastTestedAt(new Date().toISOString());
      setLastTestOk(ok);
      setLastTestError(ok ? null : (result.message ?? "Test failed."));
      if (ok) {
        toast.success(result.message ?? "Connection succeeded.");
      } else {
        toast.error(result.message ?? "Connection test failed.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setTesting(false);
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
      onTest={testConnection}
      removing={removing}
      saving={saving}
      testing={testing}
      title="Push Notifications (Pusher Beams)"
      verification={{ lastTestedAt, lastTestOk, lastTestError }}
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
