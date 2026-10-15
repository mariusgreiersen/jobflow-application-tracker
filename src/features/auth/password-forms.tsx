"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, fieldA11y } from "@/components/form-field";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from "@/lib/validations/auth";
import { requestPasswordReset, updatePassword, type AuthResult } from "./actions";
import { AuthAlert } from "./auth-ui";

export function ForgotPasswordForm({ disabled }: { disabled?: boolean }) {
  const [result, setResult] = useState<AuthResult>({});
  const [pending, startTransition] = useTransition();
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const error = form.formState.errors.email?.message;

  const onSubmit = form.handleSubmit((values) => {
    setResult({});
    startTransition(async () => setResult(await requestPasswordReset(values)));
  });

  if (result.message) return <AuthAlert tone="success">{result.message}</AuthAlert>;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {result.error && <AuthAlert tone="error">{result.error}</AuthAlert>}
      <FormField id="email" label="Email" error={error}>
        <Input
          {...fieldA11y("email", error)}
          type="email"
          autoComplete="email"
          className="h-10"
          disabled={disabled}
          {...form.register("email")}
        />
      </FormField>
      <Button type="submit" size="lg" className="h-10" disabled={pending || disabled}>
        {pending && <Loader2 className="animate-spin" />}
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [serverError, setServerError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setServerError(undefined);
    startTransition(async () => {
      const result = await updatePassword(values);
      if (result?.error) setServerError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {serverError && <AuthAlert tone="error">{serverError}</AuthAlert>}
      <FormField id="password" label="New password" error={errors.password?.message}>
        <Input
          {...fieldA11y("password", errors.password?.message)}
          type="password"
          autoComplete="new-password"
          className="h-10"
          {...form.register("password")}
        />
      </FormField>
      <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
        <Input
          {...fieldA11y("confirmPassword", errors.confirmPassword?.message)}
          type="password"
          autoComplete="new-password"
          className="h-10"
          {...form.register("confirmPassword")}
        />
      </FormField>
      <Button type="submit" size="lg" className="h-10" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Update password
      </Button>
    </form>
  );
}
