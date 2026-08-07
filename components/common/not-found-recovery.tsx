"use client";

import { useEffect } from "react";
import { isProtectedPagePath } from "@/lib/protected-routes";

const RETRIED_KEY = "docket_not_found_retried";
// Enough to cover a browsing session's worth of dead links without growing
// unbounded; oldest entries fall off the front.
const RETRIED_LIMIT = 20;

/**
 * Last line of defence against the global not-found rendering at a URL that
 * does exist.
 *
 * When a session expires, the proxy answers RSC requests for protected pages
 * with a redirect to /login. The client router follows it, gets back a flight
 * payload for a route it didn't ask for, and can end up rendering this page
 * with the address bar still pointing at /tickets. SessionGuard normally gets
 * there first, but a Pusher-driven `router.refresh()` can beat it.
 *
 * So if we're rendering at a path that requires a session, reload it as a
 * document request — the server then either serves the real page or redirects
 * to /login, both of which beat a wrong 404.
 *
 * The reload lands back on this same component (a genuine 404 renders this page
 * server-side too), so the retry is recorded *before* reloading and the reload
 * only happens if that record was written. No record, no reload — that keeps a
 * missing ticket from looping, and it's why the write comes first rather than
 * being best-effort.
 */
export function NotFoundRecovery() {
  useEffect(() => {
    const { pathname } = window.location;
    if (!isProtectedPagePath(pathname)) {
      return;
    }

    try {
      const raw = sessionStorage.getItem(RETRIED_KEY);
      const parsed: unknown = raw === null ? [] : JSON.parse(raw);
      const retried = Array.isArray(parsed)
        ? parsed.filter((p): p is string => typeof p === "string")
        : [];
      if (retried.includes(pathname)) {
        return;
      }
      sessionStorage.setItem(
        RETRIED_KEY,
        JSON.stringify([...retried, pathname].slice(-RETRIED_LIMIT))
      );
    } catch {
      // sessionStorage is unreadable or unwritable, so we can't tell a first
      // attempt from a repeat. Reloading blind would loop on a real 404.
      return;
    }

    window.location.reload();
  }, []);

  return null;
}
