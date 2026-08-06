"use client";

// Fetched at runtime from the server instead of read off
// `process.env.NEXT_PUBLIC_PUSHER_*` — those are inlined into the bundle at
// Docker *build* time, which is exactly the rebuild requirement this avoids.
// See app/api/config/client/route.ts.
let configPromise: Promise<{
  pusherKey: string | null;
  pusherCluster: string | null;
}> | null = null;

function getClientConfig() {
  configPromise ??= fetch("/api/config/client")
    .then((res) => res.json())
    .catch(() => ({ pusherKey: null, pusherCluster: null }));
  return configPromise;
}

let clientPromise: Promise<import("pusher-js").default | null> | null = null;

/**
 * Lazily creates (and reuses) a single Pusher Channels client for the whole
 * tab. Dynamic-imports `pusher-js` so it stays out of the main bundle for
 * self-hosters who never configure this. Resolves to null when Pusher
 * Channels isn't configured (see /api/config/client).
 */
export function getPusherClient(): Promise<import("pusher-js").default | null> {
  clientPromise ??= (async () => {
    const { pusherKey, pusherCluster } = await getClientConfig();
    if (!(pusherKey && pusherCluster)) {
      return null;
    }
    const { default: Pusher } = await import("pusher-js");
    return new Pusher(pusherKey, {
      cluster: pusherCluster,
      channelAuthorization: {
        endpoint: "/api/pusher/auth",
        transport: "ajax",
      },
    });
  })();
  return clientPromise;
}

/**
 * Creates a fresh (never cached/shared) Pusher client authorized as a
 * customer for one specific ticket — sends `token` alongside the standard
 * socket_id/channel_name auth fields so the server can verify it matches
 * that ticket's customerToken (see app/api/pusher/auth/route.ts). Not
 * cached like `getPusherClient()` because the customer portal lets a
 * customer navigate between sibling tickets, each with a different token.
 */
export async function getPusherClientForCustomer(
  token: string
): Promise<import("pusher-js").default | null> {
  const { pusherKey, pusherCluster } = await getClientConfig();
  if (!(pusherKey && pusherCluster)) {
    return null;
  }

  const { default: Pusher } = await import("pusher-js");
  return new Pusher(pusherKey, {
    cluster: pusherCluster,
    channelAuthorization: {
      endpoint: "/api/pusher/auth",
      transport: "ajax",
      params: { token },
    },
  });
}
