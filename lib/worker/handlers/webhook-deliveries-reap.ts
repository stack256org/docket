import { and, eq, lt, sql } from "drizzle-orm";
import type { Job } from "pg-boss";
import { webhookDeliveries } from "@/db/schema";
import { db } from "@/lib/db";

export async function handleWebhookDeliveriesReap(
  _jobs: Job<Record<string, never>>[]
) {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  await db
    .update(webhookDeliveries)
    .set({
      lastError:
        "Marked failed by webhook.deliveries-reap after being stuck in sending state.",
      status: "failed",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(webhookDeliveries.status, "sending"),
        lt(sql`${webhookDeliveries.claimedAt}`, cutoff)
      )
    );
}
