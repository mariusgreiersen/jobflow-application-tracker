/** Shared route constants. Kept dependency-free so the proxy can import them. */

export const DEMO_COOKIE = "jobflow_demo";

export const APP_HOME = "/dashboard";

/** Routes that require a signed-in user or an active demo session. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/applications",
  "/board",
  "/agenda",
  "/analytics",
  "/settings",
] as const;

/** Auth pages that signed-in users are redirected away from. */
export const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Only allow same-origin relative redirects ("/board"), never "//evil.com". */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return APP_HOME;
  }
  return next;
}
