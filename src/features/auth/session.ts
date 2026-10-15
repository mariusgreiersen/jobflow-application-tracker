import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profile } from "@/core/domain/types";
import type { DataMode } from "@/infrastructure/composition/client";
import { DEMO_PROFILE, getAuthUseCases, isAuthConfigured } from "@/infrastructure/composition/server";
import { DEMO_COOKIE } from "@/lib/routes";

export interface AppSession {
  mode: DataMode;
  profile: Profile;
}

/**
 * Server-side gate for every app page. Resolves either a demo session or a
 * verified user from the auth use case. Redirects to /login otherwise.
 */
export async function requireAppSession(): Promise<AppSession> {
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_COOKIE)?.value === "1") {
    return { mode: "demo", profile: DEMO_PROFILE };
  }
  if (!isAuthConfigured()) redirect("/login");

  const user = await getAuthUseCases().currentUser();
  if (!user) redirect("/login");
  return { mode: "supabase", profile: user };
}
