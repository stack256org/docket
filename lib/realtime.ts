import PusherServer from "pusher";
import { getPusherChannelsSettings } from "@/lib/integration-settings";

// No permanent singleton here on purpose: settings can change at runtime via
// /admin/integrations (see lib/integration-settings.ts), and constructing a
// PusherServer instance is cheap local object setup (no network call), so
// each call just resolves current settings and builds fresh.
async function getClient(): Promise<PusherServer | null> {
  const settings = await getPusherChannelsSettings();
  if (!settings) {
    return null;
  }
  return new PusherServer({
    appId: settings.appId,
    key: settings.key,
    secret: settings.secret,
    cluster: settings.cluster,
    useTLS: true,
  });
}

/** Whether Pusher Channels (real-time updates) is configured for this instance. */
export async function isRealtimeConfigured(): Promise<boolean> {
  return (await getClient()) !== null;
}

/**
 * Authorize a client's private-channel subscription. Returns null when
 * Channels isn't configured — callers should respond 404 in that case.
 */
export async function authorizeChannel(
  socketId: string,
  channel: string
): Promise<{ auth: string } | null> {
  const c = await getClient();
  return c ? c.authorizeChannel(socketId, channel) : null;
}

/**
 * Notify agents viewing the ticket list that a new ticket was created.
 * No-op when Channels isn't configured. Payload is deliberately empty — the
 * client just triggers a refetch rather than rendering pushed data directly.
 */
export async function publishTicketCreated(): Promise<void> {
  const c = await getClient();
  await c?.trigger("private-tickets", "ticket.created", {});
}

/**
 * Notify anyone viewing this ticket's detail page that a new comment (reply
 * or internal note, from any author) was added. No-op when Channels isn't
 * configured.
 */
export async function publishTicketCommentCreated(
  ticketId: string
): Promise<void> {
  const c = await getClient();
  await c?.trigger(`private-ticket-${ticketId}`, "comment.created", {});
}

/**
 * Notify one user's notification bell that a new notification was created,
 * so it refetches immediately instead of waiting on its polling fallback.
 * No-op when Channels isn't configured.
 */
export async function publishNotificationCreated(
  userId: string
): Promise<void> {
  const c = await getClient();
  await c?.trigger(`private-user-${userId}`, "notification.created", {});
}
