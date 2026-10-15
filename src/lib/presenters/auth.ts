import type { AuthFailure } from "@/core/application/ports/auth-gateway";

/** User-facing text for authentication failures. */
export function authErrorMessage(reason: AuthFailure, fallback?: string): string {
  switch (reason) {
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "email_not_confirmed":
      return "Please confirm your email address first. Check your inbox.";
    case "already_registered":
      return "An account with this email already exists.";
    case "rate_limited":
      return "Too many attempts. Please wait a minute and try again.";
    case "invalid_link":
      return "This link is invalid or has expired.";
    case "not_authenticated":
      return "Your reset link has expired. Request a new one.";
    case "unknown":
      return fallback ?? "Something went wrong. Please try again.";
  }
}
