import type { ActivityEvent, ActivityType, Application, ApplicationStatus } from "./types";

const LABEL: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** Human-readable description of a history event. */
export function describeActivity(event: Pick<ActivityEvent, "type" | "fromStatus" | "toStatus">): string {
  switch (event.type) {
    case "created":
      return "Added to JobFlow";
    case "status_changed":
      if (event.toStatus === "applied" && (!event.fromStatus || event.fromStatus === "saved")) return "Applied";
      if (event.toStatus === "offer") return "Received an offer";
      if (event.toStatus === "rejected") return "Marked as rejected";
      if (event.toStatus === "withdrawn") return "Withdrew application";
      return `Moved ${event.fromStatus ? `from ${LABEL[event.fromStatus]} ` : ""}to ${event.toStatus ? LABEL[event.toStatus] : "unknown"}`;
    case "interview_scheduled":
      return "Interview scheduled";
    case "archived":
      return "Archived";
    case "restored":
      return "Restored from archive";
  }
}

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
