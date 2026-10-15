import { deriveActivity } from "@/lib/domain/activity";
import type {
  ActivityEvent,
  Application,
  ApplicationInput,
  ApplicationPatch,
  FollowUpInput,
  FollowUpPatch,
  FollowUpTask,
  JobSnapshot,
} from "@/lib/domain/types";
import { createDemoSnapshot, DEMO_PROFILE, DEMO_USER_ID } from "@/lib/demo/seed";
import type { JobRepository } from "./repository";

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
 * Demo-mode repository. Data lives only in this browser's localStorage under a
 * dedicated key: it never touches Supabase, so demo visitors are fully isolated
 * from real accounts and from each other.
 */
export class DemoRepository implements JobRepository {
  readonly kind = "demo" as const;
  private readonly storage: StorageLike;
  private readonly clock: () => Date;
  private readonly latencyMs: number;

  constructor(options: { storage?: StorageLike; now?: () => Date; latencyMs?: number } = {}) {
    this.storage = options.storage ?? (typeof window === "undefined" ? memoryStorage() : browserStorage());
    this.clock = options.now ?? (() => new Date());
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
    const fresh: DemoState = { ...createDemoSnapshot(this.clock()), profileName: DEMO_PROFILE.fullName };
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

  private record(state: DemoState, before: Application | null, after: Application) {
    const occurredAt = this.clock().toISOString();
    const events: ActivityEvent[] = deriveActivity(before, after).map((draft) => ({
      ...draft,
      id: crypto.randomUUID(),
      userId: DEMO_USER_ID,
      occurredAt,
    }));
    state.activity = [...events.reverse(), ...state.activity];
  }

  reset() {
    this.storage.removeItem(DEMO_STORAGE_KEY);
  }

  getProfileName(): string {
    return this.read().profileName;
  }

  async load(): Promise<JobSnapshot> {
    await this.settle();
    const { applications, tasks, activity } = this.read();
    return { applications, tasks, activity };
  }

  async listActivity() {
    return this.read().activity;
  }

  async createApplication(input: ApplicationInput) {
    await this.settle();
    const state = this.read();
    const now = this.clock().toISOString();
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
    if (!before) throw new Error("Application not found");
    const after: Application = { ...before, ...stripUndefined(patch), updatedAt: this.clock().toISOString() };
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

  async createTask(input: FollowUpInput) {
    await this.settle();
    const state = this.read();
    if (!state.applications.some((a) => a.id === input.applicationId)) {
      throw new Error("Application not found");
    }
    const now = this.clock().toISOString();
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

  async updateTask(id: string, patch: FollowUpPatch) {
    await this.settle();
    const state = this.read();
    const before = state.tasks.find((t) => t.id === id);
    if (!before) throw new Error("Follow-up not found");
    const after: FollowUpTask = { ...before, ...stripUndefined(patch), updatedAt: this.clock().toISOString() };
    state.tasks = state.tasks.map((t) => (t.id === id ? after : t));
    this.write(state);
    return after;
  }

  async deleteTask(id: string) {
    await this.settle();
    const state = this.read();
    state.tasks = state.tasks.filter((t) => t.id !== id);
    this.write(state);
  }

  async updateProfileName(fullName: string) {
    await this.settle();
    const state = this.read();
    state.profileName = fullName;
    this.write(state);
  }
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
