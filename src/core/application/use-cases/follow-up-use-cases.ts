import type { FollowUpInput, FollowUpTask } from "@/core/domain/types";
import { ValidationError } from "../errors";
import type { Clock } from "../ports/clock";
import type { FollowUpRepository } from "../ports/follow-up-repository";
import type { PendingChange } from "./pending-change";

export interface FollowUpUseCasesDeps {
  followUps: FollowUpRepository;
  clock: Clock;
}

export function makeFollowUpUseCases({ followUps, clock }: FollowUpUseCasesDeps) {
  return {
    async add(input: FollowUpInput): Promise<FollowUpTask> {
      const title = input.title.trim();
      if (!title) throw new ValidationError("Describe the follow-up");
      if (Number.isNaN(Date.parse(input.dueAt))) throw new ValidationError("Pick a due date");
      return followUps.createFollowUp({ ...input, title });
    },

    /** Marks an open follow-up as done, or re-opens a completed one. */
    toggleCompleted(task: FollowUpTask): PendingChange<FollowUpTask> {
      const completedAt = task.completedAt ? null : clock.now().toISOString();
      return {
        preview: { ...task, completedAt },
        commit: () => followUps.updateFollowUp(task.id, { completedAt }),
      };
    },

    remove(id: string): Promise<void> {
      return followUps.deleteFollowUp(id);
    },
  };
}

export type FollowUpUseCases = ReturnType<typeof makeFollowUpUseCases>;
