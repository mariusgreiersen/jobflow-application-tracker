import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DEMO_COOKIE } from "@/lib/routes";
import { DEMO_PROFILE } from "@/lib/demo/seed";
import type { Profile } from "@/lib/domain/types";
import type { DataMode } from "@/features/jobs/job-data-provider";

export interface AppSession {
  mode: DataMode;
  profile: Profile;
}

/**
 * Server-side gate for every app page. Resolves either a demo session or a
 * verified Supabase user (getUser() validates the token with Supabase Auth).
 * Redirects to /login otherwise.
 */
export async function requireAppSession(): Promise<AppSession> {
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_COOKIE)?.value === "1") {
    return { mode: "demo", profile: DEMO_PROFILE };
  }
  if (!isSupabaseConfigured()) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.user.id)
    .maybeSingle();

  const metadataName = data.user.user_metadata?.full_name;
  return {
    mode: "supabase",
    profile: {
      id: data.user.id,
      email: data.user.email ?? null,
      fullName: profile?.full_name ?? (typeof metadataName === "string" ? metadataName : null),
    },
  };
}
