import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthHeader, DemoLink, NotConfiguredNotice, OrDivider } from "@/features/auth/auth-ui";
import { SignUpForm } from "@/features/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  const configured = isSupabaseConfigured();
  return (
    <>
      <AuthHeader
        title="Create your workspace"
        description={
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </>
        }
      />
      {!configured && <NotConfiguredNotice />}
      <SignUpForm disabled={!configured} />
      <OrDivider />
      <DemoLink />
    </>
  );
}
