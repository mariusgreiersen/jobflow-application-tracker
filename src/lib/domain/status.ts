import type { Application, ApplicationPatch, ApplicationStatus, WorkType } from "./types";
import { todayDateString } from "./dates";

export interface StatusMeta {
  label: string;
  description: string;
  /** Tailwind classes for the small status dot. */
  dot: string;
  /** Tailwind classes for a status badge. */
  badge: string;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  saved: {
    label: "Saved",
    description: "Bookmarked, not applied yet",
    dot: "bg-slate-400",
    badge:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/25",
  },
  applied: {
    label: "Applied",
    description: "Submitted, waiting to hear back",
    dot: "bg-sky-500",
    badge:
      "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
  },
  interview: {
    label: "Interview",
    description: "In the interview process",
    dot: "bg-violet-500",
    badge:
      "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25",
  },
  offer: {
    label: "Offer",
    description: "Offer received",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  },
  rejected: {
    label: "Rejected",
    description: "Not moving forward",
    dot: "bg-rose-500",
    badge:
      "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
  },
  withdrawn: {
    label: "Withdrawn",
    description: "You withdrew from the process",
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  },
};

export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

/** Statuses that represent an application that has actually been sent. */
export function isSubmitted(status: ApplicationStatus): boolean {
  return status !== "saved";
}

/** Applied or interviewing: still waiting on an outcome. */
export function isInProgress(status: ApplicationStatus): boolean {
  return status === "applied" || status === "interview";
}

/** Rejected or withdrawn: the process has ended without an offer. */
export function isClosed(status: ApplicationStatus): boolean {
  return status === "rejected" || status === "withdrawn";
}

/**
 * Computes the patch for moving an application to a new status.
 *
 * Any stage may move to any other (real hiring processes are not linear, e.g. a
 * rejection can be reversed), but a few invariants are maintained:
 * - Leaving "saved" for a submitted status stamps `dateApplied` with today's date
 *   if the user had not set one, so analytics have a date to bucket by.
 * - `dateApplied` is never cleared when moving back to "saved"; history is kept.
 *
 * Returns `null` when the status is unchanged.
 */
export function planStatusChange(
  app: Pick<Application, "status" | "dateApplied">,
  to: ApplicationStatus,
  now: Date = new Date(),
): ApplicationPatch | null {
  if (app.status === to) return null;
  const patch: ApplicationPatch = { status: to };
  const dateApplied = resolveAppliedDate(to, app.dateApplied, now);
  if (dateApplied !== app.dateApplied) patch.dateApplied = dateApplied;
  return patch;
}

/** A submitted application always has an applied date; default it to today. */
export function resolveAppliedDate(
  status: ApplicationStatus,
  dateApplied: string | null,
  now: Date = new Date(),
): string | null {
  return isSubmitted(status) && !dateApplied ? todayDateString(now) : dateApplied;
}
