import {
  ConnectivityError,
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/core/application/errors";

/**
 * User-facing text for any error a use case can raise. It depends only on core
 * error types, never on Supabase messages: adapters translate those first.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ValidationError) return error.message;
  if (error instanceof ConnectivityError) return "Network error: check your connection and try again.";
  if (error instanceof PermissionDeniedError) return "You don't have permission to do that.";
  if (error instanceof NotFoundError) return "It no longer exists. It may have been deleted elsewhere.";
  return "Something went wrong. Please try again.";
}
