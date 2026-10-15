import "server-only";
import { headers } from "next/headers";
import { makeAuthUseCases, type AuthUseCases } from "@/core/application/use-cases/auth-use-cases";
import { DEMO_PROFILE } from "../demo/seed";
import { isSupabaseConfigured } from "../supabase/env";
import { SupabaseAuthGateway } from "../supabase/supabase-auth-gateway";

export { DEMO_PROFILE };

/** Whether real accounts are available (Supabase configured). */
export function isAuthConfigured(): boolean {
  return isSupabaseConfigured();
}

/** Public base URL for links in auth emails. */
async function siteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Server composition root for authentication. Call only when `isAuthConfigured()`. */
export function getAuthUseCases(): AuthUseCases {
  return makeAuthUseCases({ auth: new SupabaseAuthGateway(), siteUrl });
}
