import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthHeader, NotConfiguredNotice } from "@/features/auth/auth-ui";
import { ForgotPasswordForm } from "@/features/auth/password-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  const configured = isSupabaseConfigured();
  return (
    <>
      <AuthHeader
        title="Reset your password"
        description="Enter the email you signed up with and we'll send you a reset link."
      />
      {!configured && <NotConfiguredNotice />}
      <ForgotPasswordForm disabled={!configured} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
