import { format, parseISO } from "date-fns";

/**
 * Time zone strategy:
 * - Instants (interview times, follow-up due times) are stored as UTC ISO strings
 *   (timestamptz) and always rendered in the viewer's local time zone.
 * - `dateApplied` is a calendar date with no time component (Postgres `date`).
 *   It is parsed as a *local* date so "2026-10-01" never renders as Sep 30.
 * Conversions to and from HTML input values live in `src/lib/forms/date-input.ts`.
 */

/** Local calendar date as YYYY-MM-DD. */
export function todayDateString(now: Date = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

/** Parses a YYYY-MM-DD string as local midnight. */
export function parseDateOnly(value: string): Date {
  return parseISO(value);
}
