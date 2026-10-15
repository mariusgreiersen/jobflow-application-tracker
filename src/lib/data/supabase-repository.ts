import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  ApplicationInput,
  ApplicationPatch,
  FollowUpInput,
  FollowUpPatch,
} from "@/lib/domain/types";
import type { JobRepository } from "./repository";
import { toActivity, toApplication, toApplicationUpdate, toTask, toTaskUpdate } from "./mappers";

/** Enough history for analytics without unbounded payloads. */
const ACTIVITY_LIMIT = 2000;

/**
 * Supabase-backed repository. Queries run with the user's session, so Row Level
 * Security decides what is visible. The explicit `user_id` filters exist for
 * index usage, not for security.
 */
export class SupabaseRepository implements JobRepository {
  readonly kind = "supabase" as const;

  constructor(
    private readonly db: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async load() {
    const [apps, tasks, activity] = await Promise.all([
      this.db
        .from("applications")
        .select("*")
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false }),
      this.db
        .from("follow_up_tasks")
        .select("*")
        .eq("user_id", this.userId)
        .order("due_at", { ascending: true }),
      this.activityQuery(),
    ]);
    if (apps.error) throw apps.error;
    if (tasks.error) throw tasks.error;
    if (activity.error) throw activity.error;
    return {
      applications: apps.data.map(toApplication),
      tasks: tasks.data.map(toTask),
      activity: activity.data.map(toActivity),
    };
  }

  private activityQuery() {
    return this.db
      .from("application_activity")
      .select("*")
      .eq("user_id", this.userId)
      .order("occurred_at", { ascending: false })
      .limit(ACTIVITY_LIMIT);
  }

  async listActivity() {
    const { data, error } = await this.activityQuery();
    if (error) throw error;
    return data.map(toActivity);
  }

  async createApplication(input: ApplicationInput) {
    const { data, error } = await this.db
      .from("applications")
      .insert({ ...toApplicationUpdate(input), company: input.company, job_title: input.jobTitle })
      .select()
      .single();
    if (error) throw error;
    return toApplication(data);
  }

  async updateApplication(id: string, patch: ApplicationPatch) {
    const { data, error } = await this.db
      .from("applications")
      .update(toApplicationUpdate(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toApplication(data);
  }

  async deleteApplication(id: string) {
    const { error } = await this.db.from("applications").delete().eq("id", id);
    if (error) throw error;
  }

  async createTask(input: FollowUpInput) {
    const { data, error } = await this.db
      .from("follow_up_tasks")
      .insert({ application_id: input.applicationId, title: input.title, due_at: input.dueAt })
      .select()
      .single();
    if (error) throw error;
    return toTask(data);
  }

  async updateTask(id: string, patch: FollowUpPatch) {
    const { data, error } = await this.db
      .from("follow_up_tasks")
      .update(toTaskUpdate(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toTask(data);
  }

  async deleteTask(id: string) {
    const { error } = await this.db.from("follow_up_tasks").delete().eq("id", id);
    if (error) throw error;
  }

  async updateProfileName(fullName: string) {
    const { error } = await this.db
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", this.userId);
    if (error) throw error;
    // Keep auth metadata in sync so the name survives profile re-creation.
    await this.db.auth.updateUser({ data: { full_name: fullName } });
  }
}
