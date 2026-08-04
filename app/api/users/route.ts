import { createId } from "@paralleldrive/cuid2";
import { APIError } from "better-auth/api";
import { count, desc, eq, ilike, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ADMIN_ROLE, AGENT_ROLE } from "@/config/platform";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireAdminFromRequest } from "@/lib/authz";
import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/settings";

// GET /api/users — list all users (admin only)
export async function GET(request: NextRequest) {
  try {
    requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") ?? "1", 10)
  );
  const PAGE_SIZE = 25;

  const where = q
    ? or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`))
    : undefined;

  const [users, [{ total }]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      // Newest first — must match the ordering in /admin/users.
      .orderBy(desc(user.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(user).where(where),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    pageCount: Math.ceil(total / PAGE_SIZE),
  });
}

// POST /api/users — create a new user with a password (admin only)
export async function POST(request: NextRequest) {
  try {
    requireAdminFromRequest(request);
  } catch (e) {
    return e as Response;
  }

  let body: { name?: string; email?: string; role?: string; password?: string };
  try {
    body = (await request.json()) as {
      name?: string;
      email?: string;
      role?: string;
      password?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const role = body.role?.trim() ?? AGENT_ROLE;
  const password = body.password;

  if (!name || name.length < 2 || name.length > 100) {
    return NextResponse.json(
      { error: "Name must be 2–100 characters." },
      { status: 400 }
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address." },
      { status: 400 }
    );
  }
  if (role !== AGENT_ROLE && role !== ADMIN_ROLE) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const settings = await getPlatformSettings();

  // The admin always sets the new user's password here — there is no email
  // invite flow. Nothing is sent to the new user; the admin shares the
  // password with them directly, so this works with no SMTP configured.
  if (!settings.passwordLoginEnabled) {
    return NextResponse.json(
      { error: "Password sign-in is disabled." },
      { status: 403 }
    );
  }
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    return NextResponse.json(
      { error: "Password must be 8–128 characters." },
      { status: 400 }
    );
  }

  // Check for duplicate email
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "A user with that email already exists." },
      { status: 409 }
    );
  }

  const now = new Date();
  const newId = createId();

  await db.insert(user).values({
    id: newId,
    name,
    email,
    emailVerified: true,
    role,
    banned: false,
    createdAt: now,
    updatedAt: now,
  });

  try {
    await auth.api.setUserPassword({
      headers: request.headers,
      body: { userId: newId, newPassword: password },
    });
  } catch (e) {
    // Roll back the user row so the failed attempt doesn't leave behind a
    // password-less user who could never sign in.
    await db.delete(user).where(eq(user.id, newId));
    if (e instanceof APIError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return NextResponse.json(
      { error: "Failed to set password." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: newId }, { status: 201 });
}
