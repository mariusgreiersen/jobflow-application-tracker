import type { ActivityLog } from "@/core/application/ports/activity-log";
import type { ApplicationRepository } from "@/core/application/ports/application-repository";
import type { AuthGateway, AuthResult, AuthUser } from "@/core/application/ports/auth-gateway";
import type { FollowUpRepository } from "@/core/application/ports/follow-up-repository";
import type { ProfileRepository } from "@/core/application/ports/profile-repository";
import type { ActivityEvent, Application, FollowUpTask } from "@/core/domain/types";

/**
 * Minimal in-memory implementations of the core ports. Use-case tests run
 * against these, with no database, browser storage or framework involved,
 * which is the point of keeping the core behind ports.
 */
export class InMemoryStore implements ApplicationRepository, FollowUpRepository, ActivityLog, ProfileRepository {
  applications: Application[] = [];
  tasks: FollowUpTask[] = [];
  activity: ActivityEvent[] = [];
  fullName: string | null = null;
  /** When set, the next write rejects with this error. */
  failNextWrite: Error | null = null;
  private seq = 0;

  private maybeFail() {
    if (this.failNextWrite) {
      const error = this.failNextWrite;
      this.failNextWrite = null;
      throw error;
    }
  }

  async listApplications() {
    return this.applications;
  }
  async createApplication(input: Omit<Application, "id" | "userId" | "archivedAt" | "createdAt" | "updatedAt">) {
    this.maybeFail();
    const app: Application = { ...input, id: `app-${++this.seq}`, userId: "u", archivedAt: null, createdAt: "t", updatedAt: "t" };
    this.applications.push(app);
    return app;
  }
  async updateApplication(id: string, patch: Partial<Application>) {
    this.maybeFail();
    const index = this.applications.findIndex((a) => a.id === id);
    this.applications[index] = { ...this.applications[index], ...patch };
    return this.applications[index];
  }
  async deleteApplication(id: string) {
    this.applications = this.applications.filter((a) => a.id !== id);
  }

  async listFollowUps() {
    return this.tasks;
  }
  async createFollowUp(input: { applicationId: string; title: string; dueAt: string }) {
    this.maybeFail();
    const task: FollowUpTask = { ...input, id: `task-${++this.seq}`, userId: "u", completedAt: null, createdAt: "t", updatedAt: "t" };
    this.tasks.push(task);
    return task;
  }
  async updateFollowUp(id: string, patch: Partial<FollowUpTask>) {
    this.maybeFail();
    const index = this.tasks.findIndex((t) => t.id === id);
    this.tasks[index] = { ...this.tasks[index], ...patch };
    return this.tasks[index];
  }
  async deleteFollowUp(id: string) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
  }

  async listActivity() {
    return this.activity;
  }

  async getFullName() {
    return this.fullName;
  }
  async updateFullName(fullName: string) {
    this.fullName = fullName;
  }
}

/** Scriptable auth gateway that records what it was asked to do. */
export class FakeAuthGateway implements AuthGateway {
  user: AuthUser | null = null;
  result: AuthResult = { ok: true, value: undefined };
  sessionCreated = false;
  calls: Array<{ method: string; args: unknown[] }> = [];

  private record(method: string, ...args: unknown[]) {
    this.calls.push({ method, args });
  }

  async currentUser() {
    return this.user;
  }
  async signIn(email: string, password: string) {
    this.record("signIn", email, password);
    return this.result;
  }
  async signUp(input: { fullName: string; email: string; password: string; confirmRedirectTo: string }) {
    this.record("signUp", input);
    return this.result.ok ? { ok: true as const, value: { sessionCreated: this.sessionCreated } } : this.result;
  }
  async sendPasswordReset(email: string, redirectTo: string) {
    this.record("sendPasswordReset", email, redirectTo);
    return this.result;
  }
  async updatePassword(password: string) {
    this.record("updatePassword", password);
    return this.result;
  }
  async signOut() {
    this.record("signOut");
  }
  async completeEmailLink(link: unknown) {
    this.record("completeEmailLink", link);
    return this.result;
  }
}
