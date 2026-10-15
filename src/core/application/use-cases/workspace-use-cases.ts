import type { ActivityEvent, JobSnapshot } from "@/core/domain/types";
import { ValidationError } from "../errors";
import type { ActivityLog } from "../ports/activity-log";
import type { ApplicationRepository } from "../ports/application-repository";
import type { FollowUpRepository } from "../ports/follow-up-repository";
import type { ProfileRepository } from "../ports/profile-repository";

export interface WorkspaceUseCasesDeps {
  applications: ApplicationRepository;
  followUps: FollowUpRepository;
  activity: ActivityLog;
  profiles: ProfileRepository;
}

export interface Workspace {
  snapshot: JobSnapshot;
  profileName: string | null;
}

export const MAX_NAME_LENGTH = 100;

export function makeWorkspaceUseCases({ applications, followUps, activity, profiles }: WorkspaceUseCasesDeps) {
  return {
    /** Loads everything the app needs for the current user in parallel. */
    async load(): Promise<Workspace> {
      const [apps, tasks, events, profileName] = await Promise.all([
        applications.listApplications(),
        followUps.listFollowUps(),
        activity.listActivity(),
        profiles.getFullName(),
      ]);
      return { snapshot: { applications: apps, tasks, activity: events }, profileName };
    },

    refreshActivity(): Promise<ActivityEvent[]> {
      return activity.listActivity();
    },

    async renameProfile(fullName: string): Promise<string> {
      const name = fullName.trim();
      if (!name) throw new ValidationError("Enter your name");
      if (name.length > MAX_NAME_LENGTH) throw new ValidationError("Name is too long");
      await profiles.updateFullName(name);
      return name;
    },
  };
}

export type WorkspaceUseCases = ReturnType<typeof makeWorkspaceUseCases>;
