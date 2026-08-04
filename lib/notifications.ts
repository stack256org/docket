import { createId } from "@paralleldrive/cuid2";
import { and, count, desc, eq } from "drizzle-orm";
import { notifications } from "@/db/schema";
import { db } from "@/lib/db";
import { publishNotificationCreated } from "@/lib/realtime";

export type Notification = typeof notifications.$inferSelect;

export interface NewNotification {
  body?: string;
  ticketId?: string;
  ticketNumber?: number;
  title: string;
  type: string;
}

/** Insert one notification per recipient. No-op for an empty recipient list. */
export async function createNotifications(
  recipientIds: string[],
  data: NewNotification
): Promise<void> {
  const ids = [...new Set(recipientIds)].filter(Boolean);
  if (ids.length === 0) {
    return;
  }

  const now = new Date();
  await db.insert(notifications).values(
    ids.map((userId) => ({
      id: createId(),
      userId,
      type: data.type,
      ticketId: data.ticketId ?? null,
      ticketNumber: data.ticketNumber ?? null,
      title: data.title,
      body: data.body ?? null,
      isRead: false,
      createdAt: now,
    }))
  );

  await Promise.all(
    ids.map((userId) =>
      publishNotificationCreated(userId).catch((err) =>
        console.error("[realtime.notification_created]", err)
      )
    )
  );
}

export async function listNotifications(
  userId: string,
  limit = 20
): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  return Number(row?.c ?? 0);
}

export async function markNotificationRead(
  userId: string,
  id: string
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
}
