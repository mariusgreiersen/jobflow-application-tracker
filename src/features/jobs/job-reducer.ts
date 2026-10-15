import type { ActivityEvent, Application, FollowUpTask, JobSnapshot } from "@/core/domain/types";

export interface JobState {
  status: "loading" | "ready" | "error";
  error: string | null;
  applications: Application[];
  tasks: FollowUpTask[];
  activity: ActivityEvent[];
}

export const initialJobState: JobState = {
  status: "loading",
  error: null,
  applications: [],
  tasks: [],
  activity: [],
};

export type JobAction =
  | { type: "loading" }
  | { type: "loaded"; snapshot: JobSnapshot }
  | { type: "failed"; error: string }
  | { type: "upsertApp"; app: Application }
  | { type: "removeApp"; id: string }
  | { type: "upsertTask"; task: FollowUpTask }
  | { type: "removeTask"; id: string }
  | { type: "activity"; activity: ActivityEvent[] };

function upsert<T extends { id: string }>(items: T[], item: T, prepend = false): T[] {
  const index = items.findIndex((i) => i.id === item.id);
  if (index === -1) return prepend ? [item, ...items] : [...items, item];
  const next = items.slice();
  next[index] = item;
  return next;
}

export function jobReducer(state: JobState, action: JobAction): JobState {
  switch (action.type) {
    case "loading":
      // Keep existing data visible while refreshing; only show skeletons on first load.
      return { ...state, status: state.applications.length ? state.status : "loading", error: null };
    case "loaded":
      return { status: "ready", error: null, ...action.snapshot };
    case "failed":
      return { ...state, status: "error", error: action.error };
    case "upsertApp":
      return { ...state, applications: upsert(state.applications, action.app, true) };
    case "removeApp":
      // Mirrors ON DELETE CASCADE: drop the application's follow-ups and history too.
      return {
        ...state,
        applications: state.applications.filter((a) => a.id !== action.id),
        tasks: state.tasks.filter((t) => t.applicationId !== action.id),
        activity: state.activity.filter((e) => e.applicationId !== action.id),
      };
    case "upsertTask":
      return { ...state, tasks: upsert(state.tasks, action.task) };
    case "removeTask":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case "activity":
      return { ...state, activity: action.activity };
  }
}
