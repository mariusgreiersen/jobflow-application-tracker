"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { DemoRepository } from "@/lib/data/demo-repository";
import type { JobRepository } from "@/lib/data/repository";
import { SupabaseRepository } from "@/lib/data/supabase-repository";
import { planStatusChange, STATUS_META } from "@/lib/domain/status";
import type {
  ActivityEvent,
  Application,
  ApplicationInput,
  ApplicationPatch,
  ApplicationStatus,
  FollowUpInput,
  FollowUpTask,
  JobSnapshot,
  Profile,
} from "@/lib/domain/types";
import { jobReducer, initialJobState, type JobState } from "./job-reducer";

export type DataMode = "supabase" | "demo";

interface JobDataContextValue extends JobState {
  mode: DataMode;
  profile: Profile;
  reload: () => Promise<void>;
  createApplication: (input: ApplicationInput, followUp?: Omit<FollowUpInput, "applicationId">) => Promise<Application | null>;
  updateApplication: (id: string, patch: ApplicationPatch, options?: { successMessage?: string }) => Promise<boolean>;
  moveApplication: (id: string, status: ApplicationStatus) => Promise<void>;
  setArchived: (id: string, archived: boolean) => Promise<void>;
  deleteApplication: (id: string) => Promise<boolean>;
  createTask: (input: FollowUpInput) => Promise<boolean>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateProfileName: (fullName: string) => Promise<boolean>;
  resetDemo: () => Promise<void>;
}

const JobDataContext = createContext<JobDataContextValue | null>(null);

export function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    if (/failed to fetch|network/i.test(error.message)) return "Network error: check your connection.";
    if (/row-level security|permission denied/i.test(error.message)) return "You don't have permission to do that.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function JobDataProvider({
  mode,
  profile: initialProfile,
  children,
}: {
  mode: DataMode;
  profile: Profile;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(jobReducer, initialJobState);
  const [profile, setProfile] = useReducer(
    (current: Profile, patch: Partial<Profile>) => ({ ...current, ...patch }),
    initialProfile,
  );

  // Created lazily on the client: browser storage and the Supabase browser
  // client must never be touched during server rendering.
  const repoRef = useRef<JobRepository | null>(null);
  const repo = useCallback((): JobRepository => {
    if (!repoRef.current) {
      repoRef.current =
        mode === "demo"
          ? new DemoRepository({ latencyMs: 150 })
          : new SupabaseRepository(createClient(), initialProfile.id);
    }
    return repoRef.current;
  }, [mode, initialProfile.id]);

  // Read the latest state inside callbacks without re-creating them.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const reload = useCallback(async () => {
    dispatch({ type: "loading" });
    try {
      const snapshot: JobSnapshot = await repo().load();
      dispatch({ type: "loaded", snapshot });
      const current = repoRef.current;
      if (current instanceof DemoRepository) setProfile({ fullName: current.getProfileName() });
    } catch (error) {
      dispatch({ type: "failed", error: errorMessage(error) });
    }
  }, [repo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** History is written server-side by a trigger, so re-read it after changes. */
  const refreshActivity = useCallback(async () => {
    try {
      const activity: ActivityEvent[] = await repo().listActivity();
      dispatch({ type: "activity", activity });
    } catch {
      // Non-critical: the next full load will catch up.
    }
  }, [repo]);

  const createApplication = useCallback<JobDataContextValue["createApplication"]>(
    async (input, followUp) => {
      try {
        const app = await repo().createApplication(input);
        dispatch({ type: "upsertApp", app });
        if (followUp) {
          const task = await repo().createTask({ ...followUp, applicationId: app.id });
          dispatch({ type: "upsertTask", task });
        }
        toast.success(`Added ${app.company}`);
        void refreshActivity();
        return app;
      } catch (error) {
        toast.error("Couldn't save the application", { description: errorMessage(error) });
        return null;
      }
    },
    [repo, refreshActivity],
  );

  /**
   * Applies a patch optimistically and rolls back to the previous version if the
   * save fails, so the UI never shows data that isn't persisted.
   */
  const patchOptimistically = useCallback(
    async (id: string, patch: ApplicationPatch, failureTitle: string): Promise<boolean> => {
      const previous = stateRef.current.applications.find((a) => a.id === id);
      if (!previous) return false;
      dispatch({ type: "upsertApp", app: { ...previous, ...patch } });
      try {
        const saved = await repo().updateApplication(id, patch);
        dispatch({ type: "upsertApp", app: saved });
        void refreshActivity();
        return true;
      } catch (error) {
        dispatch({ type: "upsertApp", app: previous });
        toast.error(failureTitle, { description: errorMessage(error) });
        return false;
      }
    },
    [repo, refreshActivity],
  );

  const updateApplication = useCallback<JobDataContextValue["updateApplication"]>(
    async (id, patch, options) => {
      const ok = await patchOptimistically(id, patch, "Couldn't save your changes");
      if (ok && options?.successMessage) toast.success(options.successMessage);
      return ok;
    },
    [patchOptimistically],
  );

  const moveApplication = useCallback<JobDataContextValue["moveApplication"]>(
    async (id, status) => {
      const app = stateRef.current.applications.find((a) => a.id === id);
      if (!app) return;
      const patch = planStatusChange(app, status);
      if (!patch) return;
      const ok = await patchOptimistically(id, patch, `Couldn't move ${app.company}`);
      if (ok) toast.success(`${app.company} moved to ${STATUS_META[status].label}`);
    },
    [patchOptimistically],
  );

  const setArchived = useCallback<JobDataContextValue["setArchived"]>(
    async (id, archived) => {
      const app = stateRef.current.applications.find((a) => a.id === id);
      if (!app) return;
      const ok = await patchOptimistically(
        id,
        { archivedAt: archived ? new Date().toISOString() : null },
        archived ? "Couldn't archive" : "Couldn't restore",
      );
      if (ok) toast.success(archived ? `${app.company} archived` : `${app.company} restored`);
    },
    [patchOptimistically],
  );

  const deleteApplication = useCallback<JobDataContextValue["deleteApplication"]>(
    async (id) => {
      const app = stateRef.current.applications.find((a) => a.id === id);
      try {
        await repo().deleteApplication(id);
        dispatch({ type: "removeApp", id });
        toast.success(app ? `Deleted ${app.company}` : "Application deleted");
        return true;
      } catch (error) {
        toast.error("Couldn't delete the application", { description: errorMessage(error) });
        return false;
      }
    },
    [repo],
  );

  const createTask = useCallback<JobDataContextValue["createTask"]>(
    async (input) => {
      try {
        const task = await repo().createTask(input);
        dispatch({ type: "upsertTask", task });
        toast.success("Follow-up added");
        return true;
      } catch (error) {
        toast.error("Couldn't add the follow-up", { description: errorMessage(error) });
        return false;
      }
    },
    [repo],
  );

  const toggleTask = useCallback<JobDataContextValue["toggleTask"]>(
    async (id) => {
      const previous = stateRef.current.tasks.find((t) => t.id === id);
      if (!previous) return;
      const completedAt = previous.completedAt ? null : new Date().toISOString();
      const optimistic: FollowUpTask = { ...previous, completedAt };
      dispatch({ type: "upsertTask", task: optimistic });
      try {
        const saved = await repo().updateTask(id, { completedAt });
        dispatch({ type: "upsertTask", task: saved });
      } catch (error) {
        dispatch({ type: "upsertTask", task: previous });
        toast.error("Couldn't update the follow-up", { description: errorMessage(error) });
      }
    },
    [repo],
  );

  const deleteTask = useCallback<JobDataContextValue["deleteTask"]>(
    async (id) => {
      const previous = stateRef.current.tasks.find((t) => t.id === id);
      if (!previous) return;
      dispatch({ type: "removeTask", id });
      try {
        await repo().deleteTask(id);
      } catch (error) {
        dispatch({ type: "upsertTask", task: previous });
        toast.error("Couldn't delete the follow-up", { description: errorMessage(error) });
      }
    },
    [repo],
  );

  const updateProfileName = useCallback<JobDataContextValue["updateProfileName"]>(
    async (fullName) => {
      try {
        await repo().updateProfileName(fullName);
        setProfile({ fullName });
        toast.success("Profile updated");
        return true;
      } catch (error) {
        toast.error("Couldn't update your profile", { description: errorMessage(error) });
        return false;
      }
    },
    [repo],
  );

  const resetDemo = useCallback(async () => {
    const current = repo();
    if (!(current instanceof DemoRepository)) return;
    current.reset();
    await reload();
    toast.success("Demo data reset");
  }, [repo, reload]);

  const value = useMemo<JobDataContextValue>(
    () => ({
      ...state,
      mode,
      profile,
      reload,
      createApplication,
      updateApplication,
      moveApplication,
      setArchived,
      deleteApplication,
      createTask,
      toggleTask,
      deleteTask,
      updateProfileName,
      resetDemo,
    }),
    [
      state,
      mode,
      profile,
      reload,
      createApplication,
      updateApplication,
      moveApplication,
      setArchived,
      deleteApplication,
      createTask,
      toggleTask,
      deleteTask,
      updateProfileName,
      resetDemo,
    ],
  );

  return <JobDataContext value={value}>{children}</JobDataContext>;
}

export function useJobData(): JobDataContextValue {
  const context = useContext(JobDataContext);
  if (!context) throw new Error("useJobData must be used inside <JobDataProvider>");
  return context;
}

export function useApplicationLookup() {
  const { applications } = useJobData();
  return useMemo(() => new Map(applications.map((a) => [a.id, a])), [applications]);
}
