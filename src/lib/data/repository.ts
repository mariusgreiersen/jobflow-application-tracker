import type {
  ActivityEvent,
  Application,
  ApplicationInput,
  ApplicationPatch,
  FollowUpInput,
  FollowUpPatch,
  FollowUpTask,
  JobSnapshot,
} from "@/lib/domain/types";

/**
 * Persistence boundary for the app. The UI talks only to this interface, which
 * lets the same screens run against Supabase (signed-in users) or a
 * browser-local store (demo mode) with no branching in components.
 */
export interface JobRepository {
  readonly kind: "supabase" | "demo";
  load(): Promise<JobSnapshot>;
  listActivity(): Promise<ActivityEvent[]>;

  createApplication(input: ApplicationInput): Promise<Application>;
  updateApplication(id: string, patch: ApplicationPatch): Promise<Application>;
  deleteApplication(id: string): Promise<void>;

  createTask(input: FollowUpInput): Promise<FollowUpTask>;
  updateTask(id: string, patch: FollowUpPatch): Promise<FollowUpTask>;
  deleteTask(id: string): Promise<void>;

  updateProfileName(fullName: string): Promise<void>;
}
