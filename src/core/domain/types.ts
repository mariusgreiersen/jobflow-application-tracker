export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses shown as Kanban columns. Withdrawn applications live in the list view. */
export const BOARD_STATUSES = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
] as const satisfies readonly ApplicationStatus[];
export type BoardStatus = (typeof BOARD_STATUSES)[number];

export const WORK_TYPES = ["remote", "hybrid", "onsite"] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const ACTIVITY_TYPES = [
  "created",
  "status_changed",
  "interview_scheduled",
  "archived",
  "restored",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface Application {
  id: string;
  userId: string;
  company: string;
  jobTitle: string;
  logoUrl: string | null;
  location: string | null;
  workType: WorkType | null;
  jobUrl: string | null;
  status: ApplicationStatus;
  /** Calendar date (YYYY-MM-DD). Has no time zone, so it never shifts. */
  dateApplied: string | null;
  /** ISO 8601 instant (stored as timestamptz, rendered in the viewer's zone). */
  interviewAt: string | null;
  interviewNotes: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields a user can set when creating or editing an application. */
export type ApplicationInput = Omit<
  Application,
  "id" | "userId" | "archivedAt" | "createdAt" | "updatedAt"
>;

export type ApplicationPatch = Partial<ApplicationInput> & {
  archivedAt?: string | null;
};

export interface FollowUpTask {
  id: string;
  userId: string;
  applicationId: string;
  title: string;
  /** ISO 8601 instant. */
  dueAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpInput {
  applicationId: string;
  title: string;
  dueAt: string;
}

export type FollowUpPatch = Partial<Pick<FollowUpTask, "title" | "dueAt" | "completedAt">>;

export interface ActivityEvent {
  id: string;
  userId: string;
  applicationId: string;
  type: ActivityType;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  occurredAt: string;
}

export interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
}

export interface JobSnapshot {
  applications: Application[];
  tasks: FollowUpTask[];
  activity: ActivityEvent[];
}
