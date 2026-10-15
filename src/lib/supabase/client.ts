import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser client (singleton). Reads the session from cookies set by the server. */
export function createClient() {
  if (!client) {
    const { url, key } = getSupabaseEnv();
    client = createBrowserClient<Database>(url, key);
  }
  return client;
}
