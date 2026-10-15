import "server-only";
import type { EmailOtpType } from "@supabase/supabase-js";
import type { AuthFailure, AuthGateway, AuthResult, EmailLink } from "@/core/application/ports/auth-gateway";
import { createClient } from "./server";

const OK: AuthResult = { ok: true, value: undefined };

/** Translates Supabase's error messages into the core's failure reasons. */
function failure(message: string): AuthResult<never> {
  let reason: AuthFailure = "unknown";
  if (/invalid login credentials/i.test(message)) reason = "invalid_credentials";
  else if (/email not confirmed/i.test(message)) reason = "email_not_confirmed";
  else if (/already registered|already exists/i.test(message)) reason = "already_registered";
  else if (/rate limit|too many/i.test(message)) reason = "rate_limited";
  return { ok: false, reason, message };
}

/** Server-side gateway: reads and writes the session cookie for the current request. */
export class SupabaseAuthGateway implements AuthGateway {
  async currentUser() {
    const supabase = await createClient();
    // getUser() validates the token with Supabase Auth rather than trusting the cookie.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.user.id)
      .maybeSingle();
    const metadataName = data.user.user_metadata?.full_name;
    return {
      id: data.user.id,
      email: data.user.email ?? null,
      fullName: profile?.full_name ?? (typeof metadataName === "string" ? metadataName : null),
    };
  }

  async signIn(email: string, password: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? failure(error.message) : OK;
  }

  async signUp(input: { fullName: string; email: string; password: string; confirmRedirectTo: string }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.fullName }, emailRedirectTo: input.confirmRedirectTo },
    });
    if (error) return failure(error.message);
    // With email confirmation disabled, Supabase returns a session immediately.
    return { ok: true as const, value: { sessionCreated: data.session !== null } };
  }

  async sendPasswordReset(email: string, redirectTo: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return error ? failure(error.message) : OK;
  }

  async updatePassword(password: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    return error ? failure(error.message) : OK;
  }

  async signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  async completeEmailLink(link: EmailLink) {
    const supabase = await createClient();
    const { error } =
      "code" in link
        ? await supabase.auth.exchangeCodeForSession(link.code)
        : await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type as EmailOtpType });
    return error ? { ok: false as const, reason: "invalid_link" as const, message: error.message } : OK;
  }
}
