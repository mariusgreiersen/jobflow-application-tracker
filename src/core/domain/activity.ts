import type { ActivityEvent, ActivityType, Application, ApplicationStatus } from "./types";

export type ActivityDraft = Omit<ActivityEvent, "id" | "userId" | "occurredAt">;

/**
 * Derives history events from an application change.
 * Mirrors the `log_application_activity` trigger in the Supabase migration, which
 * is the source of truth for signed-in users; demo mode uses this function.
 */
export function deriveActivity(before: Application | null, after: Application): ActivityDraft[] {
  const event = (
    type: ActivityType,
    fromStatus: ApplicationStatus | null = null,
  ): ActivityDraft => ({
    applicationId: after.id,
    type,
    fromStatus,
    toStatus: after.status,
  });

  if (!before) return [event("created")];

  const events: ActivityDraft[] = [];
  if (before.status !== after.status) events.push(event("status_changed", before.status));
  if (after.interviewAt && after.interviewAt !== before.interviewAt) {
    events.push(event("interview_scheduled"));
  }
  if (after.archivedAt && !before.archivedAt) events.push(event("archived"));
  if (!after.archivedAt && before.archivedAt) events.push(event("restored"));
  return events;
}
