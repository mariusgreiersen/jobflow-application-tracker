"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, fieldA11y } from "@/components/form-field";
import { signUpSchema, type SignUpValues } from "@/lib/validations/auth";
import { signUp } from "./actions";
import { AuthAlert } from "./auth-ui";

export function SignUpForm({ disabled }: { disabled?: boolean }) {
  const [result, setResult] = useState<{ error?: string; message?: string }>({});
  const [pending, startTransition] = useTransition();
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setResult({});
    startTransition(async () => {
      const response = await signUp(values);
      if (response) setResult(response);
      if (response?.message) form.reset();
    });
  });

  if (result.message) {
    return <AuthAlert tone="success">{result.message}</AuthAlert>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {result.error && <AuthAlert tone="error">{result.error}</AuthAlert>}
      <FormField id="fullName" label="Full name" error={errors.fullName?.message}>
        <Input
          {...fieldA11y("fullName", errors.fullName?.message)}
          autoComplete="name"
          placeholder="Ada Lovelace"
          className="h-10"
          disabled={disabled}
          {...form.register("fullName")}
        />
      </FormField>
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
      <FormField id="password" label="Password" error={errors.password?.message} hint="At least 8 characters.">
        <Input
          {...fieldA11y("password", errors.password?.message)}
          type="password"
          autoComplete="new-password"
          className="h-10"
          disabled={disabled}
          {...form.register("password")}
        />
      </FormField>
      <Button type="submit" size="lg" className="mt-2 h-10" disabled={pending || disabled}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
