import { NextResponse, type NextRequest } from "next/server";
import { getAuthUseCases, isAuthConfigured } from "@/infrastructure/composition/server";
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

  if (!isAuthConfigured()) return fail("Authentication is not configured.");

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (!code && !(tokenHash && type)) return fail("Missing confirmation code.");

  const result = await getAuthUseCases().completeEmailLink(
    code ? { code } : { tokenHash: tokenHash as string, type: type as string },
  );
  if (!result.ok) return fail("This link is invalid or has expired.");

  const response = NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : next, origin));
  response.cookies.delete(DEMO_COOKIE);
  return response;
}
