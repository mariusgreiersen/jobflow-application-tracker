import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApplicationRepository } from "@/core/application/ports/application-repository";
import type { ApplicationInput, ApplicationPatch } from "@/core/domain/types";
import type { Database } from "./database.types";
import { toCoreError } from "./errors";
import { toApplication, toApplicationUpdate } from "./mappers";

/**
 * Queries run with the user's session, so Row Level Security decides what is
 * visible. The explicit `user_id` filter exists for index usage, not security.
 */
export class SupabaseApplicationRepository implements ApplicationRepository {
  constructor(
    private readonly db: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async listApplications() {
    const { data, error } = await this.db
      .from("applications")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false });
    if (error) throw toCoreError(error, "Application");
    return data.map(toApplication);
  }

  async createApplication(input: ApplicationInput) {
    const { data, error } = await this.db
      .from("applications")
      .insert({ ...toApplicationUpdate(input), company: input.company, job_title: input.jobTitle })
      .select()
      .single();
    if (error) throw toCoreError(error, "Application");
    return toApplication(data);
  }

  async updateApplication(id: string, patch: ApplicationPatch) {
    const { data, error } = await this.db
      .from("applications")
      .update(toApplicationUpdate(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw toCoreError(error, "Application");
    return toApplication(data);
  }

  /** Follow-ups and history are removed by ON DELETE CASCADE. */
  async deleteApplication(id: string) {
    const { error } = await this.db.from("applications").delete().eq("id", id);
    if (error) throw toCoreError(error, "Application");
  }
}
