import {
  ConnectivityError,
  NotFoundError,
  PermissionDeniedError,
  PersistenceError,
  ValidationError,
} from "@/core/application/errors";

interface SupabaseLikeError {
  message?: string;
  code?: string;
}

/**
 * Translates PostgREST / Postgres / network failures into core errors.
 * See https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export function toCoreError(error: unknown, entity = "Record"): Error {
  const { message = "", code = "" } = (error ?? {}) as SupabaseLikeError;

  if (/failed to fetch|network|fetch failed|timeout/i.test(message)) return new ConnectivityError();
  // 42501 insufficient_privilege: what Row Level Security raises on a blocked write.
  if (code === "42501" || /row-level security|permission denied/i.test(message)) return new PermissionDeniedError();
  // PGRST116: `.single()` matched no rows. Under RLS, rows owned by others are invisible, so this is "not found".
  if (code === "PGRST116") return new NotFoundError(entity);
  // 23503 foreign_key_violation: e.g. a follow-up for an application the user doesn't own.
  if (code === "23503") return new NotFoundError("Application");
  // 23514 check_violation / 22P02 invalid_text_representation: input the schema rejects.
  if (code === "23514" || code === "22P02") return new ValidationError("Some of the values aren't allowed.");
  return new PersistenceError(message || "Unexpected storage error", { cause: error });
}
