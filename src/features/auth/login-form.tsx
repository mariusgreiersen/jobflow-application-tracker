"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, fieldA11y } from "@/components/form-field";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import { signIn } from "./actions";
import { AuthAlert } from "./auth-ui";

export function LoginForm({ next, disabled }: { next?: string; disabled?: boolean }) {
  const [serverError, setServerError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setServerError(undefined);
    startTransition(async () => {
      // On success the action redirects, so a returned value always means an error.
      const result = await signIn(values, next);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {serverError && <AuthAlert tone="error">{serverError}</AuthAlert>}
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          {...fieldA11y("email", errors.email?.message)}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="h-10"
          disabled={disabled}
          {...form.register("email")}
        />
      </FormField>
      <FormField
        id="password"
        label="Password"
        error={errors.password?.message}
        aside={
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        }
      >
        <Input
          {...fieldA11y("password", errors.password?.message)}
          type="password"
          autoComplete="current-password"
          className="h-10"
          disabled={disabled}
          {...form.register("password")}
        />
      </FormField>
      <Button type="submit" size="lg" className="mt-2 h-10" disabled={pending || disabled}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Signing in…" : "Log in"}
      </Button>
    </form>
  );
}
