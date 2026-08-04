"use server";

import { eq } from "drizzle-orm";
import { user, verification } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Looks up the email a reset/password-setup token belongs to, without
 * consuming it — Better Auth's own `/reset-password` endpoint does the
 * actual (single-use) consumption. Used to auto sign-in right after a
 * successful reset, so accepting an invite is one step instead of two.
 */
export async function getResetTokenEmail(
  token: string
): Promise<string | null> {
  const [row] = await db
    .select({ userId: verification.value, expiresAt: verification.expiresAt })
    .from(verification)
    .where(eq(verification.identifier, `reset-password:${token}`))
    .limit(1);

  if (!row || row.expiresAt < new Date()) {
    return null;
  }

  const [target] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, row.userId))
    .limit(1);

  return target?.email ?? null;
}
