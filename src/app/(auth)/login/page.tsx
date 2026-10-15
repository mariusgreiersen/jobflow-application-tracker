import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthAlert, AuthHeader, DemoLink, NotConfiguredNotice, OrDivider } from "@/features/auth/auth-ui";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const configured = isSupabaseConfigured();

  return (
    <>
      <AuthHeader
        title="Welcome back"
        description={
          <>
            New to JobFlow?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </>
        }
      />
      {!configured && <NotConfiguredNotice />}
      {error && (
        <div className="mb-4">
          <AuthAlert tone="error">{error}</AuthAlert>
        </div>
      )}
      <LoginForm next={next} disabled={!configured} />
      <OrDivider />
      <DemoLink />
    </>
  );
}
