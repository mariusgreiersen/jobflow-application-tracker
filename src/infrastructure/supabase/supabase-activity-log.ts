import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityLog } from "@/core/application/ports/activity-log";
import type { Database } from "./database.types";
import { toCoreError } from "./errors";
import { toActivity } from "./mappers";

/** Enough history for analytics without unbounded payloads. */
const ACTIVITY_LIMIT = 2000;

/** Rows are written by the `log_application_activity` database trigger. */
export class SupabaseActivityLog implements ActivityLog {
  constructor(
    private readonly db: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async listActivity() {
    const { data, error } = await this.db
      .from("application_activity")
      .select("*")
      .eq("user_id", this.userId)
      .order("occurred_at", { ascending: false })
      .limit(ACTIVITY_LIMIT);
    if (error) throw toCoreError(error, "Activity");
    return data.map(toActivity);
  }
}
