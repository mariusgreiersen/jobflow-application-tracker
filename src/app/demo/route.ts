import { NextResponse, type NextRequest } from "next/server";
import { APP_HOME, DEMO_COOKIE } from "@/lib/routes";

/**
 * Starts demo mode: sets a cookie the dashboard layout uses to swap in the
 * browser-local demo repository. No account and no Supabase access involved.
 * A GET route so "/demo" can be shared as a direct link.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL(APP_HOME, request.url));
  response.cookies.set(DEMO_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
