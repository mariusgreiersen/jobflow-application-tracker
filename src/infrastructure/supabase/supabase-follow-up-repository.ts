import type { SupabaseClient } from "@supabase/supabase-js";
import type { FollowUpRepository } from "@/core/application/ports/follow-up-repository";
import type { FollowUpInput, FollowUpPatch } from "@/core/domain/types";
import type { Database } from "./database.types";
import { toCoreError } from "./errors";
import { toTask, toTaskUpdate } from "./mappers";

export class SupabaseFollowUpRepository implements FollowUpRepository {
  constructor(
    private readonly db: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async listFollowUps() {
    const { data, error } = await this.db
      .from("follow_up_tasks")
      .select("*")
      .eq("user_id", this.userId)
      .order("due_at", { ascending: true });
    if (error) throw toCoreError(error, "Follow-up");
    return data.map(toTask);
  }

  /** The composite foreign key rejects applications owned by another user. */
  async createFollowUp(input: FollowUpInput) {
    const { data, error } = await this.db
      .from("follow_up_tasks")
      .insert({ application_id: input.applicationId, title: input.title, due_at: input.dueAt })
      .select()
      .single();
    if (error) throw toCoreError(error, "Follow-up");
    return toTask(data);
  }

  async updateFollowUp(id: string, patch: FollowUpPatch) {
    const { data, error } = await this.db
      .from("follow_up_tasks")
      .update(toTaskUpdate(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw toCoreError(error, "Follow-up");
    return toTask(data);
  }

  async deleteFollowUp(id: string) {
    const { error } = await this.db.from("follow_up_tasks").delete().eq("id", id);
    if (error) throw toCoreError(error, "Follow-up");
  }
}
