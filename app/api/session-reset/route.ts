import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Destroys the caller's session cookies and drops them at /login.
//
// This exists because Server Components can't set cookies — a page that
// discovers a broken session (its user row is gone, or they were banned out of
// band) can only `redirect()`, leaving the bad cookies in place for the next
// request to trip over. Sending them here instead actually clears the cookies,
// including Better Auth's `session_data` cookie cache, so the bad state can't
// survive the redirect.
//
// Deliberately unauthenticated and GET-able: the whole point is that it runs
// when there is no usable session left to authenticate with.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // signOut never throws on an unknown/invalid session — it best-effort deletes
  // the row and always emits the cookie-clearing Set-Cookie headers.
  const signOutResponse = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });

  const response = NextResponse.redirect(
    new URL("/login", request.nextUrl.origin)
  );
  for (const cookie of signOutResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
