import { differenceInCalendarDays, format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from "date-fns";
import { parseDateOnly } from "./dates";

/** Up to two initials from a company or person name: "Northwind Labs" -> "NL". */
export function initials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Deterministic hue (0-359) from a string, used for generated logo colors. */
export function hueFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

export function formatDateOnly(value: string | null, pattern = "MMM d, yyyy"): string {
  if (!value) return "—";
  return format(parseDateOnly(value), pattern);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "EEE, MMM d · HH:mm");
}

export function formatTime(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

/** "Today", "Tomorrow", "Yesterday" or a weekday + date. */
export function relativeDayLabel(date: Date, now: Date = new Date()): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  const diff = differenceInCalendarDays(date, now);
  return format(date, diff > -7 && diff < 7 ? "EEEE, MMM d" : "EEE, MMM d, yyyy");
}

export function timeAgo(iso: string): string {
  return `${formatDistanceToNowStrict(new Date(iso))} ago`;
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min === null && max === null) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  const unit = currency ? ` ${currency}` : "";
  if (min !== null && max !== null) return min === max ? `${fmt(min)}${unit}` : `${fmt(min)}–${fmt(max)}${unit}`;
  if (min !== null) return `${fmt(min)}+${unit}`;
  return `Up to ${fmt(max as number)}${unit}`;
}

export function formatPercent(rate: number | null): string {
  if (rate === null) return "—";
  return `${Math.round(rate * 100)}%`;
}

export function hostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
