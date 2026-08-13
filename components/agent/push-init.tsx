"use client";

import { useEffect } from "react";

/** Registers the agent's browser with Pusher Beams for OS-level push. Config is
 * fetched at runtime from /api/config/client rather than read off NEXT_PUBLIC_*
 * (see lib/pusher-browser.ts). Renders nothing; no-op when unconfigured or
 * unsupported. */
export function PushInit({ userId }: { userId: string }) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { beamsInstanceId } = (await fetch("/api/config/client").then(
          (res) => res.json()
        )) as { beamsInstanceId: string | null };
        if (!beamsInstanceId || cancelled) {
          return;
        }

        const PusherPushNotifications = await import(
          "@pusher/push-notifications-web"
        );
        const beamsClient = new PusherPushNotifications.Client({
          instanceId: beamsInstanceId,
        });
        const tokenProvider = new PusherPushNotifications.TokenProvider({
          url: "/api/notifications/beams-auth",
        });

        await beamsClient.start();
        if (cancelled) {
          return;
        }
        // Associate this device with the signed-in agent. Re-running with a
        // different user reassigns the device, so sign-out/in "just works".
        await beamsClient.setUserId(userId, tokenProvider);
      } catch (err) {
        // Permission denied / unsupported browser / token endpoint unavailable —
        // all non-fatal (OS push simply won't work; in-app + email still do).
        console.warn(
          "[beams] push registration skipped:",
          err instanceof Error ? err.message : err
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
