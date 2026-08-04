"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ADMIN_ROLE, AGENT_ROLE } from "@/config/platform";
import { user } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";

export async function setUserRoleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? AGENT_ROLE);

  if (![ADMIN_ROLE, AGENT_ROLE].includes(role)) {
    return;
  }
  if (userId === admin.id && role !== ADMIN_ROLE) {
    return;
  }

  await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.id, userId));

  await audit({
    action: "orbit.user_role_updated",
    actorEmail: admin.email,
    actorId: admin.id,
    description: `Updated user role to ${role}`,
    entityId: userId,
    entityType: "user",
    metadata: { role },
  });

  revalidatePath("/orbit/users");
}

export async function toggleUserBanAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const banned = String(formData.get("banned") ?? "false") === "true";

  if (userId === admin.id && banned) {
    return;
  }

  await db
    .update(user)
    .set({
      banReason: banned ? "Disabled by Orbit admin" : null,
      banned,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  await audit({
    action: banned ? "orbit.user_banned" : "orbit.user_unbanned",
    actorEmail: admin.email,
    actorId: admin.id,
    description: banned ? "Banned user" : "Unbanned user",
    entityId: userId,
    entityType: "user",
  });

  revalidatePath("/orbit/users");
}
