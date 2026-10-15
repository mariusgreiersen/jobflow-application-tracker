import { describe, expect, it } from "vitest";
import {
  ConnectivityError,
  NotFoundError,
  PermissionDeniedError,
  PersistenceError,
  ValidationError,
} from "@/core/application/errors";
import { toCoreError } from "@/infrastructure/supabase/errors";
import { authErrorMessage } from "@/lib/presenters/auth";
import { errorMessage } from "@/lib/presenters/errors";

describe("Supabase error translation (adapter)", () => {
  it.each([
    [{ code: "42501", message: 'new row violates row-level security policy for table "applications"' }, PermissionDeniedError],
    [{ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }, NotFoundError],
    [{ code: "23503", message: "violates foreign key constraint" }, NotFoundError],
    [{ code: "23514", message: "violates check constraint" }, ValidationError],
    [{ message: "TypeError: Failed to fetch" }, ConnectivityError],
    [{ code: "XX000", message: "internal error" }, PersistenceError],
  ])("maps %o to a core error", (input, expected) => {
    expect(toCoreError(input)).toBeInstanceOf(expected);
  });

  it("keeps the original error as the cause for debugging", () => {
    const original = { code: "XX000", message: "boom" };
    expect((toCoreError(original) as PersistenceError).cause).toBe(original);
  });
});

describe("error presenters", () => {
  it("shows validation messages verbatim and hides internal details otherwise", () => {
    expect(errorMessage(new ValidationError("Job title is required"))).toBe("Job title is required");
    expect(errorMessage(new PermissionDeniedError())).toMatch(/permission/);
    expect(errorMessage(new PersistenceError("relation applications does not exist"))).toBe("Something went wrong. Please try again.");
  });

  it("has a message for every auth failure reason", () => {
    expect(authErrorMessage("invalid_credentials")).toBe("Incorrect email or password.");
    expect(authErrorMessage("unknown", "Provider message")).toBe("Provider message");
  });
});
