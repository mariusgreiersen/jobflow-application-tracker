import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(100, "Name is too long"),
  email,
  password,
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(100, "Name is too long"),
});
export type ProfileValues = z.infer<typeof profileSchema>;
