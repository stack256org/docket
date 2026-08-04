"use client";

import { useState } from "react";
import { requestPasswordSetupAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

/**
 * `hasPassword` — false for accounts with no `credential` row yet (invited
 * via magic link, Google-only sign-in). They get a "set a password" flow
 * instead of a change form, since there's no current password to verify.
 */
export function PasswordCard({ hasPassword }: { hasPassword: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-soft p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Password</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {hasPassword
            ? "Change the password used to sign in."
            : "You don't have a password set yet — you're signing in another way (Google or a magic link)."}
        </p>
      </div>
      {hasPassword ? <ChangePasswordForm /> : <SetPasswordPrompt />}
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSubmitting(true);
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? "Failed to change password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2" htmlFor="currentPassword">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Current password
          </span>
          <Input
            autoComplete="current-password"
            id="currentPassword"
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            type="password"
            value={currentPassword}
          />
        </label>
        <label className="block" htmlFor="newPassword">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            New password
          </span>
          <Input
            autoComplete="new-password"
            id="newPassword"
            minLength={8}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            type="password"
            value={newPassword}
          />
        </label>
        <label className="block" htmlFor="confirmPassword">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Confirm new password
          </span>
          <Input
            autoComplete="new-password"
            id="confirmPassword"
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          checked={revokeOtherSessions}
          className="size-3.5 cursor-pointer rounded border-border"
          onChange={(e) => setRevokeOtherSessions(e.target.checked)}
          type="checkbox"
        />
        Sign out of all other devices
      </label>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-success-subtle px-3 py-2 text-sm text-success-foreground">
          Password changed.
        </p>
      )}

      <Button
        disabled={
          submitting || !(currentPassword && newPassword && confirmPassword)
        }
        type="submit"
      >
        {submitting ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}

function SetPasswordPrompt() {
  return (
    <form action={requestPasswordSetupAction}>
      <Button type="submit" variant="outline">
        Set a password
      </Button>
    </form>
  );
}
