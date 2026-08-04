/**
 * Agent/admin sidebar open-vs-collapsed state.
 *
 * Stored in a cookie rather than localStorage so the server layout can read it
 * and render the correct width in the initial HTML — no width flash on load and
 * no hydration mismatch. Kept free of `next/headers` so the client sidebar can
 * import the same constants when it writes the cookie back.
 */
export const SIDEBAR_COOKIE = "support_tool_sidebar";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function isSidebarCollapsed(value: string | undefined): boolean {
  return value === "collapsed";
}
