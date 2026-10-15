import type { Application, ApplicationInput, ApplicationPatch } from "@/core/domain/types";

/** Persistence for applications. Implementations must scope everything to the current user. */
export interface ApplicationRepository {
  listApplications(): Promise<Application[]>;
  createApplication(input: ApplicationInput): Promise<Application>;
  updateApplication(id: string, patch: ApplicationPatch): Promise<Application>;
  /** Also removes the application's follow-ups and history. */
  deleteApplication(id: string): Promise<void>;
}
