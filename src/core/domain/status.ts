import type { Application, ApplicationPatch, ApplicationStatus } from "./types";
import { todayDateString } from "./dates";

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

/**
 * Scheduling an interview implies the process has reached the interview stage,
 * so earlier-stage applications are moved forward. Later stages (offer) and
 * closed applications keep their status.
 */
export function planInterview(
  app: Pick<Application, "status" | "dateApplied" | "interviewNotes">,
  interview: { interviewAt: string; notes: string | null },
  now: Date = new Date(),
): ApplicationPatch {
  const patch: ApplicationPatch = {
    interviewAt: interview.interviewAt,
    interviewNotes: interview.notes ?? app.interviewNotes,
  };
  if (app.status === "saved" || app.status === "applied") {
    Object.assign(patch, planStatusChange(app, "interview", now));
  }
  return patch;
}
