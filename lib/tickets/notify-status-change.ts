import {
  dispatchWebhookEvent,
  type TicketEventTicket,
  ticketPayloadData,
} from "@/lib/webhooks/dispatch";

/**
 * Dispatches the right webhook event for a status transition — used by both
 * the dedicated /close and /reopen routes AND the generic ticket PATCH
 * route's status field, so a ticket closed via either path always emits the
 * same `ticket.closed` event to integrators (the two paths already diverge
 * on email/SLA side effects; webhooks shouldn't add a third inconsistency).
 */
export async function notifyTicketStatusChange(
  ticket: TicketEventTicket,
  wasClosedState: boolean,
  isClosedState: boolean
): Promise<void> {
  const event =
    !wasClosedState && isClosedState
      ? "ticket.closed"
      : wasClosedState && !isClosedState
        ? "ticket.reopened"
        : "ticket.status_changed";

  await dispatchWebhookEvent(event, "ticket", ticket.id, {
    ticket: ticketPayloadData(ticket),
  });
}
