import { format, isValid, parseISO } from "date-fns";

/** Adapters between HTML date inputs (local time) and domain ISO strings. */

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
