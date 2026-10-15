/**
 * Errors the core understands. Adapters translate their own failures (Postgres
 * codes, network errors…) into these, so outer layers never need to know which
 * database or SDK produced them.
 */

/** Input violates a business rule. The message is safe to show to users. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(entity: string) {
    super(`${entity} not found`);
    this.name = "NotFoundError";
  }
}

/** The current user may not perform this operation (e.g. blocked by Row Level Security). */
export class PermissionDeniedError extends Error {
  constructor(message = "Permission denied") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

/** The data store could not be reached. Retrying may succeed. */
export class ConnectivityError extends Error {
  constructor(message = "Could not reach the server") {
    super(message);
    this.name = "ConnectivityError";
  }
}

/** Any other storage failure. `cause` keeps the original error for debugging. */
export class PersistenceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PersistenceError";
  }
}
