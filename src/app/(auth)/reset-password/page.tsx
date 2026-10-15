import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/auth-ui";
import { ResetPasswordForm } from "@/features/auth/password-forms";

export const metadata: Metadata = { title: "Choose a new password" };

/** Reached from the recovery email via /auth/callback, which establishes a session. */
export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeader title="Choose a new password" description="Pick something you haven't used before." />
      <ResetPasswordForm />
    </>
  );
}
