import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getSupabaseEnv, isSupabaseConfigured } from "./env";

/**
 * Refreshes the Supabase session cookie for an incoming request (used by the
 * Next.js proxy). Returns the response carrying any refreshed cookies, and
 * whether the request belongs to a signed-in user.
 */
export async function refreshSession(request: NextRequest): Promise<{ response: NextResponse; isSignedIn: boolean }> {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return { response, isSignedIn: false };

  const { url, key } = getSupabaseEnv();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [header, value] of Object.entries(headers ?? {})) response.headers.set(header, value);
      },
    },
  });

  // getClaims() validates the JWT and refreshes an expired session.
  // Nothing may run between creating the client and this call.
  const { data } = await supabase.auth.getClaims();
  return { response, isSignedIn: Boolean(data?.claims?.sub) };
}
