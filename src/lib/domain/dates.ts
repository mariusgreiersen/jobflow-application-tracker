import { format, isValid, parseISO } from "date-fns";

/**
 * Time zone strategy:
 * - Instants (interview times, follow-up due times) are stored as UTC ISO strings
 *   (timestamptz) and always rendered in the viewer's local time zone.
 * - `dateApplied` is a calendar date with no time component (Postgres `date`).
 *   It is parsed as a *local* date so "2026-10-01" never renders as Sep 30.
 */

/** Local calendar date as YYYY-MM-DD. */
export function todayDateString(now: Date = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

/** Parses a YYYY-MM-DD string as local midnight. */
export function parseDateOnly(value: string): Date {
  return parseISO(value);
}

/** Converts an ISO instant into the value expected by <input type="datetime-local">. */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!isValid(date)) return "";
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Converts a datetime-local input value (interpreted in the browser's zone)
 * to a UTC ISO instant. Returns null for empty or invalid input.
 */
export function fromDateTimeLocalValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? date.toISOString() : null;
}

/** Converts a date input (YYYY-MM-DD) into an ISO instant at local 09:00. */
export function dateInputToMorningIso(value: string): string | null {
  if (!value) return null;
  const date = parseISO(`${value}T09:00`);
  return isValid(date) ? date.toISOString() : null;
}
