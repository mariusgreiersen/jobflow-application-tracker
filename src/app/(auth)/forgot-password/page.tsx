import type { Metadata } from "next";
import Link from "next/link";
import { isAuthConfigured } from "@/infrastructure/composition/server";
import { AuthHeader, NotConfiguredNotice } from "@/features/auth/auth-ui";
import { ForgotPasswordForm } from "@/features/auth/password-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  const configured = isAuthConfigured();
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
