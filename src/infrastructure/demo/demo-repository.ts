import type { ActivityLog } from "@/core/application/ports/activity-log";
import type { ApplicationRepository } from "@/core/application/ports/application-repository";
import type { Clock } from "@/core/application/ports/clock";
import type { FollowUpRepository } from "@/core/application/ports/follow-up-repository";
import type { ProfileRepository } from "@/core/application/ports/profile-repository";
import { NotFoundError } from "@/core/application/errors";
import { deriveActivity } from "@/core/domain/activity";
import type {
  ActivityEvent,
  Application,
  ApplicationInput,
  ApplicationPatch,
  FollowUpInput,
  FollowUpPatch,
  FollowUpTask,
  JobSnapshot,
} from "@/core/domain/types";
import { createDemoSnapshot, DEMO_PROFILE, DEMO_USER_ID } from "./seed";

export const DEMO_STORAGE_KEY = "jobflow-demo-v1";

interface DemoState extends JobSnapshot {
  profileName: string;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** In-memory fallback when localStorage is unavailable (private mode, tests). */
function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function browserStorage(): StorageLike {
  try {
    const probe = "__jobflow_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return memoryStorage();
  }
}

/**
 * Demo-mode persistence. Data lives only in this browser's localStorage under a
 * dedicated key: it never touches Supabase, so demo visitors are fully isolated
 * from real accounts and from each other.
 *
 * It plays the role of the database, so it implements every repository port and
 * reproduces the database's side effects: cascading deletes, and the history
 * trigger (via the same `deriveActivity` rule the SQL trigger mirrors).
 */
export class DemoRepository implements ApplicationRepository, FollowUpRepository, ActivityLog, ProfileRepository {
  private readonly storage: StorageLike;
  private readonly clock: Clock;
  private readonly latencyMs: number;

  constructor(options: { storage?: StorageLike; clock?: Clock; latencyMs?: number } = {}) {
    this.storage = options.storage ?? (typeof window === "undefined" ? memoryStorage() : browserStorage());
    this.clock = options.clock ?? { now: () => new Date() };
    this.latencyMs = options.latencyMs ?? 0;
  }

  private read(): DemoState {
    const raw = this.storage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as DemoState;
        if (Array.isArray(parsed.applications) && Array.isArray(parsed.tasks)) return parsed;
      } catch {
        // Corrupt data: fall through and reseed.
      }
    }
    const fresh: DemoState = { ...createDemoSnapshot(this.clock.now()), profileName: DEMO_PROFILE.fullName };
    this.write(fresh);
    return fresh;
  }

  private write(state: DemoState) {
    this.storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  }

  /** Simulated network latency so loading states are exercised in the demo. */
  private async settle() {
    if (this.latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }

  /** Equivalent of the `log_application_activity` database trigger. */
  private record(state: DemoState, before: Application | null, after: Application) {
    const occurredAt = this.clock.now().toISOString();
    const events: ActivityEvent[] = deriveActivity(before, after).map((draft) => ({
      ...draft,
      id: crypto.randomUUID(),
      userId: DEMO_USER_ID,
      occurredAt,
    }));
    state.activity = [...events.reverse(), ...state.activity];
  }

  /** Discards all demo changes; the next read reseeds the sample data. */
  reset() {
    this.storage.removeItem(DEMO_STORAGE_KEY);
  }

  // --- ApplicationRepository

  async listApplications() {
    await this.settle();
    return this.read().applications;
  }

  async createApplication(input: ApplicationInput) {
    await this.settle();
    const state = this.read();
    const now = this.clock.now().toISOString();
    const app: Application = {
      ...input,
      id: crypto.randomUUID(),
      userId: DEMO_USER_ID,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    state.applications = [app, ...state.applications];
    this.record(state, null, app);
    this.write(state);
    return app;
  }

  async updateApplication(id: string, patch: ApplicationPatch) {
    await this.settle();
    const state = this.read();
    const before = state.applications.find((a) => a.id === id);
    if (!before) throw new NotFoundError("Application");
    const after: Application = { ...before, ...stripUndefined(patch), updatedAt: this.clock.now().toISOString() };
    state.applications = state.applications.map((a) => (a.id === id ? after : a));
    this.record(state, before, after);
    this.write(state);
    return after;
  }

  async deleteApplication(id: string) {
    await this.settle();
    const state = this.read();
    // Mirrors ON DELETE CASCADE in the database.
    state.applications = state.applications.filter((a) => a.id !== id);
    state.tasks = state.tasks.filter((t) => t.applicationId !== id);
    state.activity = state.activity.filter((e) => e.applicationId !== id);
    this.write(state);
  }

  // --- FollowUpRepository

  async listFollowUps() {
    return this.read().tasks;
  }

  async createFollowUp(input: FollowUpInput) {
    await this.settle();
    const state = this.read();
    // Mirrors the composite foreign key: the application must exist.
    if (!state.applications.some((a) => a.id === input.applicationId)) throw new NotFoundError("Application");
    const now = this.clock.now().toISOString();
    const task: FollowUpTask = {
      ...input,
      id: crypto.randomUUID(),
      userId: DEMO_USER_ID,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    state.tasks = [...state.tasks, task];
    this.write(state);
    return task;
  }

  async updateFollowUp(id: string, patch: FollowUpPatch) {
    await this.settle();
    const state = this.read();
    const before = state.tasks.find((t) => t.id === id);
    if (!before) throw new NotFoundError("Follow-up");
    const after: FollowUpTask = { ...before, ...stripUndefined(patch), updatedAt: this.clock.now().toISOString() };
    state.tasks = state.tasks.map((t) => (t.id === id ? after : t));
    this.write(state);
    return after;
  }

  async deleteFollowUp(id: string) {
    await this.settle();
    const state = this.read();
    state.tasks = state.tasks.filter((t) => t.id !== id);
    this.write(state);
  }

  // --- ActivityLog

  async listActivity() {
    return this.read().activity;
  }

  // --- ProfileRepository

  async getFullName() {
    return this.read().profileName;
  }

  async updateFullName(fullName: string) {
    await this.settle();
    const state = this.read();
    state.profileName = fullName;
    this.write(state);
  }
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
