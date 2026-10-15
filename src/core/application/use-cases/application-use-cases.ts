import { planInterview, planStatusChange, resolveAppliedDate } from "@/core/domain/status";
import type {
  Application,
  ApplicationInput,
  ApplicationPatch,
  ApplicationStatus,
  FollowUpTask,
} from "@/core/domain/types";
import { ValidationError } from "../errors";
import type { ApplicationRepository } from "../ports/application-repository";
import type { Clock } from "../ports/clock";
import type { FollowUpRepository } from "../ports/follow-up-repository";
import type { PendingChange } from "./pending-change";

export interface ApplicationUseCasesDeps {
  applications: ApplicationRepository;
  followUps: FollowUpRepository;
  clock: Clock;
}

export interface CreateApplicationResult {
  application: Application;
  followUp: FollowUpTask | null;
}

function assertValidInput(input: ApplicationInput) {
  if (!input.company.trim()) throw new ValidationError("Company name is required");
  if (!input.jobTitle.trim()) throw new ValidationError("Job title is required");
  if (input.salaryMin !== null && input.salaryMax !== null && input.salaryMax < input.salaryMin) {
    throw new ValidationError("Maximum salary must be at least the minimum");
  }
}

export function makeApplicationUseCases({ applications, followUps, clock }: ApplicationUseCasesDeps) {
  const change = (app: Application, patch: ApplicationPatch): PendingChange<Application> => ({
    preview: { ...app, ...patch },
    commit: () => applications.updateApplication(app.id, patch),
  });

  return {
    /** Adds an application, optionally with a follow-up reminder due at `followUpDueAt`. */
    async create(input: ApplicationInput, options: { followUpDueAt?: string | null } = {}): Promise<CreateApplicationResult> {
      assertValidInput(input);
      const application = await applications.createApplication({
        ...input,
        dateApplied: resolveAppliedDate(input.status, input.dateApplied, clock.now()),
      });
      const followUp = options.followUpDueAt
        ? await followUps.createFollowUp({
            applicationId: application.id,
            title: `Follow up with ${application.company}`,
            dueAt: options.followUpDueAt,
          })
        : null;
      return { application, followUp };
    },

    /** Replaces the editable fields of an application. */
    edit(app: Application, input: ApplicationInput): PendingChange<Application> {
      assertValidInput(input);
      return change(app, {
        ...input,
        dateApplied: resolveAppliedDate(input.status, input.dateApplied, clock.now()),
      });
    },

    /** Moves an application to another stage, e.g. from the Kanban board. */
    move(app: Application, to: ApplicationStatus): PendingChange<Application> | null {
      const patch = planStatusChange(app, to, clock.now());
      return patch ? change(app, patch) : null;
    },

    scheduleInterview(app: Application, interview: { interviewAt: string; notes: string | null }): PendingChange<Application> {
      return change(app, planInterview(app, interview, clock.now()));
    },

    /** Archiving hides an application from active views but keeps its history. */
    setArchived(app: Application, archived: boolean): PendingChange<Application> | null {
      if (Boolean(app.archivedAt) === archived) return null;
      return change(app, { archivedAt: archived ? clock.now().toISOString() : null });
    },

    remove(id: string): Promise<void> {
      return applications.deleteApplication(id);
    },
  };
}

export type ApplicationUseCases = ReturnType<typeof makeApplicationUseCases>;
