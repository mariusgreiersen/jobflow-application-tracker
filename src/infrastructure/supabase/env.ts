/**
 * Public Supabase settings. Both values are safe to ship to the browser: the
 * publishable (anon) key only grants what Row Level Security allows.
 * The service-role key is intentionally never read anywhere in this app.
 *
 * NEXT_PUBLIC_* variables must be referenced literally so Next.js can inline them.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key);
}

export function getSupabaseEnv(): { url: string; key: string } {
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
  return { url, key };
}
