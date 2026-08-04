"use client";

import { useEffect } from "react";

// How often to re-check while the tab is in the foreground. Long enough to be
// invisible in the request log, short enough that an idle tab doesn't sit on a
// dead session for minutes.
const POLL_MS = 60_000;

/**
 * Sends the agent portal to /login once the session behind it has expired.
 *
 * Without this, an expired session is discovered by whatever the client router
 * happens to do next — a <Link> click, a prefetch, or the `router.refresh()`
 * the Pusher listeners fire on every ticket/comment event. Those are RSC
 * requests, and the proxy can only answer them with a redirect to /login. The
 * browser follows it with the RSC headers still attached, so the router gets
 * back a valid flight payload for a route it never asked for, fails to
 * reconcile it against the tree it requested, and renders the global not-found
 * boundary at the URL it was already on — the "404 Page not found" screen at
 * /tickets, instead of the login page.
 *
 * So we find out first, on our own terms, and leave via a full page load
 * (not router.push, which would be another RSC request into the same trap).
 */
export function SessionGuard() {
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (cancelled || document.visibilityState !== "visible") {
        return;
      }
      let res: Response;
      try {
        res = await fetch("/api/account/session", { cache: "no-store" });
      } catch {
        // Offline or a dropped connection — not an auth failure. Signing
        // someone out because their wifi blipped would be worse than waiting.
        return;
      }
      if (cancelled || (res.status !== 401 && res.status !== 403)) {
        return;
      }
      cancelled = true;
      window.location.href = "/login";
    };

    const interval = setInterval(check, POLL_MS);
    // A tab that's been in the background is the likeliest one to be holding a
    // session that expired while nobody was looking.
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return null;
}
