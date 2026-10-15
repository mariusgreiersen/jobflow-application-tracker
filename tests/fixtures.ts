import type { ActivityEvent, Application, FollowUpTask } from "@/core/domain/types";

let seq = 0;

export function makeApp(overrides: Partial<Application> = {}): Application {
  seq += 1;
  return {
    id: `app-${seq}`,
    userId: "user-1",
    company: `Company ${seq}`,
    jobTitle: "Software Engineer",
    logoUrl: null,
    location: "Copenhagen, Denmark",
    workType: "hybrid",
    jobUrl: null,
    status: "applied",
    dateApplied: "2026-10-01",
    interviewAt: null,
    interviewNotes: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    notes: null,
    archivedAt: null,
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-01T08:00:00.000Z",
    ...overrides,
  };
}

export function makeTask(overrides: Partial<FollowUpTask> = {}): FollowUpTask {
  seq += 1;
  return {
    id: `task-${seq}`,
    userId: "user-1",
    applicationId: "app-1",
    title: "Follow up",
    dueAt: "2026-10-15T07:00:00.000Z",
    completedAt: null,
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-01T08:00:00.000Z",
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  seq += 1;
  return {
    id: `event-${seq}`,
    userId: "user-1",
    applicationId: "app-1",
    type: "status_changed",
    fromStatus: "applied",
    toStatus: "interview",
    occurredAt: "2026-10-05T10:00:00.000Z",
    ...overrides,
  };
}
