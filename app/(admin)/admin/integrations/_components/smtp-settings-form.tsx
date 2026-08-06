"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntegrationSettingsSummary } from "@/lib/integration-settings";
import { IntegrationCard } from "./integration-card";
import { SecretInput } from "./secret-input";

type Smtp = IntegrationSettingsSummary["smtp"];

interface Props {
  collapsible?: boolean;
  defaultOpen?: boolean;
  initial: Smtp;
}

export function SmtpSettingsForm({ initial, collapsible, defaultOpen }: Props) {
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(String(initial.port));
  const [user, setUser] = useState(initial.user);
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState(initial.from);
  const [hasPassword, setHasPassword] = useState(initial.hasPassword);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const configured = !!(host && user && from && hasPassword);

  async function patch(body: Record<string, unknown>, successMessage: string) {
    const res = await fetch("/api/admin/integration-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smtp: body }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save.");
      return false;
    }
    toast.success(successMessage);
    return true;
  }

  async function save() {
    setSaving(true);
    try {
      const portNum = Number.parseInt(port, 10);
      const ok = await patch(
        {
          host,
          port: Number.isFinite(portNum) ? portNum : undefined,
          user,
          from,
          pass: pass || undefined,
        },
        "SMTP settings saved."
      );
      if (ok) {
        if (pass) {
          setHasPassword(true);
        }
        setPass("");
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
        { host: "", port: 587, user: "", from: "", pass: "" },
        "SMTP settings removed."
      );
      if (ok) {
        setHost("");
        setPort("587");
        setUser("");
        setFrom("");
        setPass("");
        setHasPassword(false);
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
      description="Send ticket notifications, magic links, and password resets. Without it, emails are logged instead of delivered."
      onRemove={remove}
      onSave={save}
      removing={removing}
      saving={saving}
      title="Email (SMTP)"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="smtp-host">Host</Label>
          <Input
            disabled={saving}
            id="smtp-host"
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.example.com"
            value={host}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtp-port">Port</Label>
          <Input
            disabled={saving}
            id="smtp-port"
            inputMode="numeric"
            onChange={(e) => setPort(e.target.value)}
            placeholder="587"
            value={port}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="smtp-user">Username</Label>
          <Input
            disabled={saving}
            id="smtp-user"
            onChange={(e) => setUser(e.target.value)}
            value={user}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtp-pass">Password</Label>
          <SecretInput
            disabled={saving}
            hasSavedValue={hasPassword}
            id="smtp-pass"
            onChange={setPass}
            value={pass}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="smtp-from">From address</Label>
        <Input
          disabled={saving}
          id="smtp-from"
          onChange={(e) => setFrom(e.target.value)}
          placeholder="support@example.com"
          value={from}
        />
      </div>
    </IntegrationCard>
  );
}
