import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DEMO_COOKIE, safeNextPath } from "@/lib/routes";

/**
 * Landing point for links in Supabase auth emails (sign-up confirmation and
 * password recovery). Handles both the PKCE `code` flow and the `token_hash`
 * flow used by customised email templates.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, origin));

  if (!isSupabaseConfigured()) return fail("Authentication is not configured.");

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("This link is invalid or has expired.");
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail("This link is invalid or has expired.");
  } else {
    return fail("Missing confirmation code.");
  }

  const response = NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : next, origin));
  response.cookies.delete(DEMO_COOKIE);
  return response;
}
