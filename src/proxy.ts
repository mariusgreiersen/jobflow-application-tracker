import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { APP_HOME, DEMO_COOKIE, GUEST_ONLY_PATHS, isProtectedPath } from "@/lib/routes";
import { isSupabaseConfigured, getSupabaseEnv } from "@/lib/supabase/env";

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
  const isProtected = isProtectedPath(pathname);

  if (!isSupabaseConfigured()) {
    if (isProtected && !isDemo) return redirectTo(request, "/login");
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [header, value] of Object.entries(headers ?? {})) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // getClaims() validates the JWT and refreshes an expired session.
  // Nothing may run between creating the client and this call.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);

  if (isProtected && !isSignedIn && !isDemo) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return withCookies(NextResponse.redirect(loginUrl), response);
  }

  if (isSignedIn && (GUEST_ONLY_PATHS as readonly string[]).includes(pathname)) {
    return withCookies(redirectTo(request, APP_HOME), response);
  }

  return response;
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
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
