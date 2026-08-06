import { eq, isNotNull } from "drizzle-orm";
import { cache } from "react";
import { ADMIN_ROLE } from "@/config/platform";
import { user } from "@/db/schema";
import { platformSettings } from "@/db/schema/settings";
import { db } from "@/lib/db";

/**
 * Whether at least one admin user exists. This is the signal that gates
 * unauthenticated bootstrap paths — `/api/setup` (POST) and `/login` both
 * self-disable the moment an admin is in the database, so the bootstrap path
 * can never be used to mint a second admin on a live install.
 *
 * This is deliberately *not* the same thing as "the setup wizard is done" —
 * see `isSetupComplete()` below.
 *
 * `cache()` memoizes the lookup per-request so the multiple call sites (page
 * redirect guards + the API route) share one query.
 */
export const hasAdminUser = cache(async (): Promise<boolean> => {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, ADMIN_ROLE))
    .limit(1);
  return Boolean(existing);
});

/**
 * Whether the setup wizard has actually been finished — i.e. `platform_settings.setup_completed_at`
 * was stamped by `POST /api/setup/finish`, which only fires when the wizard's
 * last step calls `finish()`. An admin existing is not enough: the account is
 * created a step earlier (in `POST /api/setup`), so a reload of `/setup`
 * while the wizard is still sitting on the (unpersisted, client-only)
 * Integrations step must resume the wizard, not bounce to `/login`.
 */
export const isSetupComplete = cache(async (): Promise<boolean> => {
  const [existing] = await db
    .select({ id: platformSettings.id })
    .from(platformSettings)
    .where(isNotNull(platformSettings.setupCompletedAt))
    .limit(1);
  return Boolean(existing);
});
