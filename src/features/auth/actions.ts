"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { APP_HOME, DEMO_COOKIE, safeNextPath } from "@/lib/routes";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
  type ForgotPasswordValues,
  type LoginValues,
  type ResetPasswordValues,
  type SignUpValues,
} from "@/lib/validations/auth";

export type AuthResult = { error?: string; message?: string };

const NOT_CONFIGURED: AuthResult = {
  error: "Accounts aren't available because Supabase isn't configured. You can still try the demo.",
};

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

/** Leaving demo mode when signing in avoids mixing demo and real sessions. */
async function clearDemoCookie() {
  (await cookies()).delete(DEMO_COOKIE);
}

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email address first. Check your inbox.";
  if (/already registered|already exists/i.test(message)) return "An account with this email already exists.";
  if (/rate limit/i.test(message)) return "Too many attempts. Please wait a minute and try again.";
  return message;
}

export async function signIn(values: LoginValues, next?: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the highlighted fields." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: friendlyAuthError(error.message) };

  await clearDemoCookie();
  redirect(safeNextPath(next));
}

export async function signUp(values: SignUpValues): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the highlighted fields." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=${APP_HOME}`,
    },
  });
  if (error) return { error: friendlyAuthError(error.message) };

  // With email confirmation disabled, Supabase returns a session immediately.
  if (data.session) {
    await clearDemoCookie();
    redirect(APP_HOME);
  }
  return { message: `We sent a confirmation link to ${parsed.data.email}. Open it to activate your account.` };
}

export async function requestPasswordReset(values: ForgotPasswordValues): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error && /rate limit/i.test(error.message)) return { error: friendlyAuthError(error.message) };

  // Same response whether or not the account exists, so emails can't be enumerated.
  return { message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(values: ResetPasswordValues): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the highlighted fields." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Your reset link has expired. Request a new one." };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: friendlyAuthError(error.message) };
  redirect(APP_HOME);
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  await clearDemoCookie();
  redirect("/login");
}

export async function exitDemo(): Promise<void> {
  await clearDemoCookie();
  redirect("/");
}
