import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRepository } from "@/core/application/ports/profile-repository";
import type { Database } from "./database.types";
import { toCoreError } from "./errors";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(
    private readonly db: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async getFullName() {
    const { data, error } = await this.db.from("profiles").select("full_name").eq("id", this.userId).maybeSingle();
    if (error) throw toCoreError(error, "Profile");
    return data?.full_name ?? null;
  }

  async updateFullName(fullName: string) {
    const { error } = await this.db.from("profiles").update({ full_name: fullName }).eq("id", this.userId);
    if (error) throw toCoreError(error, "Profile");
    // Keep auth metadata in sync so the name survives profile re-creation.
    await this.db.auth.updateUser({ data: { full_name: fullName } });
  }
}
