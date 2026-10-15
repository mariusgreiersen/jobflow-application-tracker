import type { FollowUpInput, FollowUpPatch, FollowUpTask } from "@/core/domain/types";

export interface FollowUpRepository {
  listFollowUps(): Promise<FollowUpTask[]>;
  /** Must reject follow-ups for applications the user does not own. */
  createFollowUp(input: FollowUpInput): Promise<FollowUpTask>;
  updateFollowUp(id: string, patch: FollowUpPatch): Promise<FollowUpTask>;
  deleteFollowUp(id: string): Promise<void>;
}
