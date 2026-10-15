import { NextResponse, type NextRequest } from "next/server";
import { APP_HOME, DEMO_COOKIE, GUEST_ONLY_PATHS, isProtectedPath } from "@/lib/routes";
import { refreshSession } from "@/infrastructure/supabase/proxy-session";

/**
 * Runs before every page request:
 * 1. Refreshes the Supabase session cookie so Server Components see a valid session.
 * 2. Redirects unauthenticated visitors away from app routes (demo visitors are allowed).
 * 3. Redirects signed-in users away from login/sign-up pages.
 *
 * The dashboard layout repeats the auth check on the server. The proxy is a fast
 * first gate, not the only one.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDemo = request.cookies.get(DEMO_COOKIE)?.value === "1";
  const { response, isSignedIn } = await refreshSession(request);

  if (isProtectedPath(pathname) && !isSignedIn && !isDemo) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return withCookies(NextResponse.redirect(loginUrl), response);
  }

  if (isSignedIn && (GUEST_ONLY_PATHS as readonly string[]).includes(pathname)) {
    return withCookies(NextResponse.redirect(new URL(APP_HOME, request.url)), response);
  }

  return response;
}

/** Carries refreshed auth cookies over to a redirect response. */
function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

export const config = {
  matcher: [
    // Everything except static assets, image optimisation and metadata files.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
