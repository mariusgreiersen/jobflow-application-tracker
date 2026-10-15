"use server";

/**
 * Auth controllers: validate the request (Zod), call the auth use case, and
 * translate the outcome into a redirect or a user-facing message.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AFTER_SIGN_IN_PATH } from "@/core/application/use-cases/auth-use-cases";
import { getAuthUseCases, isAuthConfigured } from "@/infrastructure/composition/server";
import { DEMO_COOKIE, safeNextPath } from "@/lib/routes";
import { authErrorMessage } from "@/lib/presenters/auth";
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

export type AuthActionResult = { error?: string; message?: string };

const NOT_CONFIGURED: AuthActionResult = {
  error: "Accounts aren't available because Supabase isn't configured. You can still try the demo.",
};
const INVALID_INPUT: AuthActionResult = { error: "Please check the highlighted fields." };

/** Leaving demo mode when signing in avoids mixing demo and real sessions. */
async function clearDemoCookie() {
  (await cookies()).delete(DEMO_COOKIE);
}

export async function signIn(values: LoginValues, next?: string): Promise<AuthActionResult> {
  if (!isAuthConfigured()) return NOT_CONFIGURED;
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;

  const result = await getAuthUseCases().signIn(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: authErrorMessage(result.reason, result.message) };

  await clearDemoCookie();
  redirect(safeNextPath(next));
}

export async function signUp(values: SignUpValues): Promise<AuthActionResult> {
  if (!isAuthConfigured()) return NOT_CONFIGURED;
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;

  const result = await getAuthUseCases().signUp(parsed.data);
  if (!result.ok) return { error: authErrorMessage(result.reason, result.message) };

  if (result.value.sessionCreated) {
    await clearDemoCookie();
    redirect(AFTER_SIGN_IN_PATH);
  }
  return { message: `We sent a confirmation link to ${parsed.data.email}. Open it to activate your account.` };
}

export async function requestPasswordReset(values: ForgotPasswordValues): Promise<AuthActionResult> {
  if (!isAuthConfigured()) return NOT_CONFIGURED;
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return { error: "Enter a valid email address." };

  const result = await getAuthUseCases().requestPasswordReset(parsed.data.email);
  if (!result.ok) return { error: authErrorMessage(result.reason, result.message) };
  return { message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(values: ResetPasswordValues): Promise<AuthActionResult> {
  if (!isAuthConfigured()) return NOT_CONFIGURED;
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;

  const result = await getAuthUseCases().changePassword(parsed.data.password);
  if (!result.ok) return { error: authErrorMessage(result.reason, result.message) };
  redirect(AFTER_SIGN_IN_PATH);
}

export async function signOut(): Promise<void> {
  if (isAuthConfigured()) await getAuthUseCases().signOut();
  await clearDemoCookie();
  redirect("/login");
}

export async function exitDemo(): Promise<void> {
  await clearDemoCookie();
  redirect("/");
}
