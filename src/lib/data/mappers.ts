import type {
  ActivityEvent,
  Application,
  ApplicationPatch,
  FollowUpPatch,
  FollowUpTask,
} from "@/lib/domain/types";
import type { ActivityRow, ApplicationRow, Database, FollowUpTaskRow } from "@/types/database";

type ApplicationUpdate = Database["public"]["Tables"]["applications"]["Update"];
type FollowUpUpdate = Database["public"]["Tables"]["follow_up_tasks"]["Update"];

export function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    userId: row.user_id,
    company: row.company,
    jobTitle: row.job_title,
    logoUrl: row.logo_url,
    location: row.location,
    workType: row.work_type,
    jobUrl: row.job_url,
    status: row.status,
    dateApplied: row.date_applied,
    interviewAt: row.interview_at,
    interviewNotes: row.interview_notes,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    salaryCurrency: row.salary_currency,
    notes: row.notes,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const APPLICATION_COLUMNS: Record<keyof ApplicationPatch, keyof ApplicationUpdate> = {
  company: "company",
  jobTitle: "job_title",
  logoUrl: "logo_url",
  location: "location",
  workType: "work_type",
  jobUrl: "job_url",
  status: "status",
  dateApplied: "date_applied",
  interviewAt: "interview_at",
  interviewNotes: "interview_notes",
  salaryMin: "salary_min",
  salaryMax: "salary_max",
  salaryCurrency: "salary_currency",
  notes: "notes",
  archivedAt: "archived_at",
};

/** Maps only the keys present in the patch, so partial updates stay partial. */
export function toApplicationUpdate(patch: ApplicationPatch): ApplicationUpdate {
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const column = APPLICATION_COLUMNS[key as keyof ApplicationPatch];
    if (column) update[column] = value;
  }
  return update as ApplicationUpdate;
}

export function toTask(row: FollowUpTaskRow): FollowUpTask {
  return {
    id: row.id,
    userId: row.user_id,
    applicationId: row.application_id,
    title: row.title,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTaskUpdate(patch: FollowUpPatch): FollowUpUpdate {
  const update: FollowUpUpdate = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.dueAt !== undefined) update.due_at = patch.dueAt;
  if (patch.completedAt !== undefined) update.completed_at = patch.completedAt;
  return update;
}

export function toActivity(row: ActivityRow): ActivityEvent {
  return {
    id: row.id,
    userId: row.user_id,
    applicationId: row.application_id,
    type: row.type,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    occurredAt: row.occurred_at,
  };
}
