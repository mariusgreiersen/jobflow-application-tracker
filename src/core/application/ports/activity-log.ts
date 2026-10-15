import type { ActivityEvent } from "@/core/domain/types";

/**
 * Read-only view of application history. History is written as a side effect of
 * persisting application changes (a database trigger, or the demo store), never
 * by use cases directly, so it cannot be forged by clients.
 */
export interface ActivityLog {
  listActivity(): Promise<ActivityEvent[]>;
}
