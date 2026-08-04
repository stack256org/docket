import { type SQL, sql } from "drizzle-orm";
import { tickets } from "@/db/schema/tickets";

/** Elapsed/target ratio at which a live metric turns from green to yellow. */
export const WARNING_THRESHOLD = 0.8;

export type WaitState =
  | "waiting_for_agent"
  | "waiting_for_customer"
  | "resolved";

export type MetricStatus = "met" | "on_track" | "warning" | "breached";

/** A resolved ticket's final SLA verdict, across all of its targets. */
export type SlaOutcome = "met" | "breached";

/** "45m", "2h 15m", "1d 4h", "3d" — shared by the admin policy form (minutes
 * → seconds) and the ticking SLA badges (live elapsed/remaining seconds). */
export function formatDuration(totalSeconds: number): string {
  const abs = Math.max(0, Math.round(totalSeconds));
  if (abs < 60) {
    return `${abs}s`;
  }
  const days = Math.floor(abs / 86_400);
  const hours = Math.floor((abs % 86_400) / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export interface SlaMetricSnapshot {
  /** ISO instant `elapsedSeconds` is valid at. */
  asOf: string;
  /** Elapsed seconds as of `asOf`. When `live`, the caller re-derives the
   * current value via `getLiveElapsedSeconds()` instead of re-fetching. */
  elapsedSeconds: number;
  /** Final outcome once the target is genuinely finished (already responded /
   * ticket resolved). Absent while `live` or `paused`. */
  frozen?: "met" | "breached";
  label: "First response" | "Next response" | "Resolution";
  /** True while this metric's elapsed time keeps advancing in real time. */
  live: boolean;
  /** Clock stopped but the target is NOT finished — the ticket is still open
   * and the ball is in the customer's court. Renders as a paused countdown;
   * never claims "met", because nothing has been met yet. */
  paused?: boolean;
  targetSeconds: number;
}

export interface SlaSnapshot {
  createdAt: string;
  /** Null only when no SLA policy applies at all (e.g. none configured yet). */
  firstResponse: SlaMetricSnapshot | null;
  /** Null before the first response happens, or while waiting on the
   * customer (nothing is currently due from the agent). */
  nextResponse: SlaMetricSnapshot | null;
  resolution: SlaMetricSnapshot | null;
  /** Total lifetime, created → closed. Null while still open. Every
   * "how long has this been around" readout switches to this once resolved,
   * so nothing keeps counting up after the ticket is done. */
  resolvedInSeconds: number | null;
  /** When the CURRENT wait state began — null once resolved. */
  waitingSince: string | null;
  waitState: WaitState;
}

export interface SlaPolicyTargets {
  firstResponseMinutes: number;
  nextResponseMinutes: number;
  resolutionMinutes: number;
}

export interface SlaTicketState {
  awaitingReply: boolean;
  closedAt: Date | null;
  createdAt: Date;
  firstRespondedAt: Date | null;
  slaActiveSeconds: number;
  waitingSince: Date | null;
}

function secondsBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
}

export function resolveWaitState(
  ticket: Pick<SlaTicketState, "closedAt" | "awaitingReply">
): WaitState {
  if (ticket.closedAt) {
    return "resolved";
  }
  return ticket.awaitingReply ? "waiting_for_agent" : "waiting_for_customer";
}

/**
 * Builds the full SLA snapshot for one ticket against one resolved policy.
 * Pure function — no DB/React — so it's reused identically by the ticket
 * list query, the detail page, and the client-side ticking badge (via
 * getLiveElapsedSeconds/getMetricStatus below).
 */
export function computeSlaSnapshot(
  ticket: SlaTicketState,
  policy: SlaPolicyTargets | null,
  now: Date
): SlaSnapshot {
  const waitState = resolveWaitState(ticket);
  const nowIso = now.toISOString();

  const base = {
    waitState,
    waitingSince: ticket.waitingSince
      ? ticket.waitingSince.toISOString()
      : null,
    createdAt: ticket.createdAt.toISOString(),
    resolvedInSeconds: ticket.closedAt
      ? secondsBetween(ticket.createdAt, ticket.closedAt)
      : null,
  };

  if (!policy) {
    return {
      ...base,
      firstResponse: null,
      nextResponse: null,
      resolution: null,
    };
  }

  // First response — elapsed is frozen the moment firstRespondedAt is set;
  // otherwise it's still climbing (unless the ticket got resolved without
  // ever getting one, in which case it's frozen at the close time — not at
  // `now`, or a closed-unanswered ticket's "took Xd" would grow forever).
  const firstResponseLive =
    !ticket.firstRespondedAt && waitState !== "resolved";
  const firstResponseElapsed = secondsBetween(
    ticket.createdAt,
    ticket.firstRespondedAt ?? ticket.closedAt ?? now
  );
  const firstResponseTarget = policy.firstResponseMinutes * 60;
  const firstResponse: SlaMetricSnapshot = {
    label: "First response",
    targetSeconds: firstResponseTarget,
    elapsedSeconds: firstResponseElapsed,
    asOf: nowIso,
    live: firstResponseLive,
    frozen: firstResponseLive
      ? undefined
      : firstResponseElapsed <= firstResponseTarget
        ? "met"
        : "breached",
  };

  // Next response — only relevant once the first response has happened, the
  // ticket is still open, and the ball is currently in the agent's court.
  let nextResponse: SlaMetricSnapshot | null = null;
  if (ticket.firstRespondedAt && waitState === "waiting_for_agent") {
    const since = ticket.waitingSince ?? ticket.createdAt;
    nextResponse = {
      label: "Next response",
      targetSeconds: policy.nextResponseMinutes * 60,
      elapsedSeconds: secondsBetween(since, now),
      asOf: nowIso,
      live: true,
    };
  }

  // Resolution — accumulated active seconds, plus the live in-progress span
  // while currently waiting on the agent. Frozen once resolved.
  const since = ticket.waitingSince ?? ticket.createdAt;
  const liveSpanSeconds =
    waitState === "waiting_for_agent" ? secondsBetween(since, now) : 0;
  const resolutionElapsed = ticket.slaActiveSeconds + liveSpanSeconds;
  const resolutionTarget = policy.resolutionMinutes * 60;
  // Only "live" (still advancing) while actively waiting on the agent.
  // Paused (waiting on the customer) and resolved are both non-advancing, but
  // they are NOT the same verdict: resolved is final (met/breached), paused is
  // a stopped countdown on a ticket that still has to be resolved.
  const resolutionLive = waitState === "waiting_for_agent";
  const resolutionPaused = !resolutionLive && waitState !== "resolved";
  const resolution: SlaMetricSnapshot = {
    label: "Resolution",
    targetSeconds: resolutionTarget,
    elapsedSeconds: resolutionElapsed,
    asOf: nowIso,
    live: resolutionLive,
    paused: resolutionPaused || undefined,
    frozen:
      resolutionLive || resolutionPaused
        ? undefined
        : resolutionElapsed <= resolutionTarget
          ? "met"
          : "breached",
  };

  return { ...base, firstResponse, nextResponse, resolution };
}

/** Re-derives a live metric's current elapsed seconds — the one thing that
 * changes between server render and each client tick. No-op for frozen ones. */
export function getLiveElapsedSeconds(
  metric: SlaMetricSnapshot,
  nowMs: number
): number {
  if (!metric.live) {
    return metric.elapsedSeconds;
  }
  const asOfMs = new Date(metric.asOf).getTime();
  return metric.elapsedSeconds + Math.max(0, (nowMs - asOfMs) / 1000);
}

export function getMetricStatus(
  metric: SlaMetricSnapshot,
  nowMs: number
): MetricStatus {
  // Paused metrics fall through to the ratio check below: the clock is stopped
  // but the target is still owed, so it stays on_track/warning/breached — a
  // paused metric can never report "met".
  if (!(metric.live || metric.paused)) {
    return metric.frozen ?? "met";
  }
  if (metric.targetSeconds <= 0) {
    return "on_track";
  }
  const ratio = getLiveElapsedSeconds(metric, nowMs) / metric.targetSeconds;
  if (ratio >= 1) {
    return "breached";
  }
  if (ratio >= WARNING_THRESHOLD) {
    return "warning";
  }
  return "on_track";
}

/**
 * A resolved ticket's single SLA verdict — breached if ANY target was missed,
 * met only if every one held. This is what a closed ticket shows in place of
 * the countdown it no longer has: the outcome, not a running clock.
 * Null while the ticket is still open, or when no policy applies.
 */
export function getSlaOutcome(snapshot: SlaSnapshot): SlaOutcome | null {
  if (snapshot.waitState !== "resolved") {
    return null;
  }
  const metrics = [snapshot.firstResponse, snapshot.resolution].filter(
    (m): m is SlaMetricSnapshot => m !== null
  );
  if (metrics.length === 0) {
    return null;
  }
  return metrics.some((m) => m.frozen === "breached") ? "breached" : "met";
}

export interface SlaTransitionPatch {
  slaActiveSeconds?: SQL<unknown>;
  waitingSince?: Date | null;
}

/**
 * The single place that encodes the SLA pause/resume rule. Every route that
 * mutates `tickets.awaitingReply` calls this and merges the result into its
 * existing `.update(tickets).set({...})` — no timer math duplicated anywhere.
 *
 * - mode "reply": a customer or agent reply flips (or doesn't flip)
 *   awaitingReply. No-ops if `nextAwaitingReply` matches the current value
 *   (e.g. a customer's second follow-up before the agent replies) — the
 *   response clock stays pinned to the first unanswered message.
 * - mode "closing": ticket is being closed. Flushes any in-progress active
 *   span into slaActiveSeconds, then stops the clock (waitingSince: null).
 * - mode "reopening": ticket is being reopened from "resolved". Always
 *   (re)starts the clock at `now`, regardless of direction — there's no
 *   in-progress span to flush since it was already stopped at close.
 *   slaActiveSeconds carries forward unchanged (Resolution SLA tracks total
 *   active time across the ticket's whole lifetime, including reopens).
 */
export function computeSlaTransition(
  current: { awaitingReply: boolean; waitingSince: Date | null },
  nextAwaitingReply: boolean,
  now: Date,
  mode: "reply" | "closing" | "reopening" = "reply"
): SlaTransitionPatch {
  if (mode === "reopening") {
    return { waitingSince: now };
  }

  if (mode === "closing") {
    if (current.awaitingReply && current.waitingSince) {
      const elapsed = secondsBetween(current.waitingSince, now);
      return {
        waitingSince: null,
        slaActiveSeconds: sql`${tickets.slaActiveSeconds} + ${elapsed}`,
      };
    }
    return { waitingSince: null };
  }

  // mode === "reply"
  if (current.awaitingReply === nextAwaitingReply) {
    return {};
  }
  if (nextAwaitingReply) {
    return { waitingSince: now };
  }
  const elapsed = current.waitingSince
    ? secondsBetween(current.waitingSince, now)
    : 0;
  return {
    waitingSince: now,
    slaActiveSeconds: sql`${tickets.slaActiveSeconds} + ${elapsed}`,
  };
}
