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
import type { PendingChange } from "@/core/application/use-cases/pending-change";
import type {
  Application,
  ApplicationInput,
  ApplicationStatus,
  FollowUpInput,
  FollowUpTask,
  Profile,
} from "@/core/domain/types";
import { createWorkspaceServices, type DataMode, type WorkspaceServices } from "@/infrastructure/composition/client";
import { errorMessage } from "@/lib/presenters/errors";
import { STATUS_META } from "@/lib/presenters/status";
import { jobReducer, initialJobState, type JobState } from "./job-reducer";

export type { DataMode };

interface JobDataContextValue extends JobState {
  mode: DataMode;
  profile: Profile;
  reload: () => Promise<void>;
  createApplication: (input: ApplicationInput, options?: { followUpDueAt?: string | null }) => Promise<Application | null>;
  editApplication: (id: string, input: ApplicationInput) => Promise<boolean>;
  moveApplication: (id: string, status: ApplicationStatus) => Promise<void>;
  scheduleInterview: (id: string, interview: { interviewAt: string; notes: string | null }) => Promise<boolean>;
  setArchived: (id: string, archived: boolean) => Promise<void>;
  deleteApplication: (id: string) => Promise<boolean>;
  addFollowUp: (input: FollowUpInput) => Promise<boolean>;
  toggleFollowUp: (id: string) => Promise<void>;
  deleteFollowUp: (id: string) => Promise<void>;
  updateProfileName: (fullName: string) => Promise<boolean>;
  /** Defined only in demo mode. */
  resetDemo?: () => Promise<void>;
}

const JobDataContext = createContext<JobDataContextValue | null>(null);

/**
 * Runs an operation and reports failure as a toast.
 * Returns the result, or `undefined` if it threw.
 */
async function attempt<T>(failureTitle: string, operation: () => T | Promise<T>): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    toast.error(failureTitle, { description: errorMessage(error) });
    return undefined;
  }
}

/**
 * Presentation-side state for the workspace (a controller over the use cases).
 * Business decisions are made by use cases; this provider holds UI state,
 * renders use-case previews optimistically, rolls them back on failure and
 * reports outcomes as toasts.
 */
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
  const servicesRef = useRef<WorkspaceServices | null>(null);
  const services = useCallback((): WorkspaceServices => {
    servicesRef.current ??= createWorkspaceServices(mode, initialProfile.id);
    return servicesRef.current;
  }, [mode, initialProfile.id]);

  // Read the latest state inside callbacks without re-creating them.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const findApp = useCallback((id: string) => stateRef.current.applications.find((a) => a.id === id), []);
  const findTask = useCallback((id: string) => stateRef.current.tasks.find((t) => t.id === id), []);

  const reload = useCallback(async () => {
    dispatch({ type: "loading" });
    try {
      const { snapshot, profileName } = await services().workspace.load();
      dispatch({ type: "loaded", snapshot });
      if (profileName) setProfile({ fullName: profileName });
    } catch (error) {
      dispatch({ type: "failed", error: errorMessage(error) });
    }
  }, [services]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** History is written as a side effect of persistence, so re-read it after changes. */
  const refreshActivity = useCallback(async () => {
    try {
      dispatch({ type: "activity", activity: await services().workspace.refreshActivity() });
    } catch {
      // Non-critical: the next full load will catch up.
    }
  }, [services]);

  /**
   * Shows a use case's preview immediately, persists it, and restores the
   * previous version if saving fails, so the UI never shows unsaved data.
   */
  const commitApp = useCallback(
    async (previous: Application, change: PendingChange<Application>, failureTitle: string) => {
      dispatch({ type: "upsertApp", app: change.preview });
      const saved = await attempt(failureTitle, change.commit);
      dispatch({ type: "upsertApp", app: saved ?? previous });
      if (saved) void refreshActivity();
      return saved !== undefined;
    },
    [refreshActivity],
  );

  const commitTask = useCallback(async (previous: FollowUpTask, change: PendingChange<FollowUpTask>) => {
    dispatch({ type: "upsertTask", task: change.preview });
    const saved = await attempt("Couldn't update the follow-up", change.commit);
    dispatch({ type: "upsertTask", task: saved ?? previous });
  }, []);

  const createApplication = useCallback<JobDataContextValue["createApplication"]>(
    async (input, options) => {
      const result = await attempt("Couldn't save the application", () =>
        services().applications.create(input, options),
      );
      if (!result) return null;
      dispatch({ type: "upsertApp", app: result.application });
      if (result.followUp) dispatch({ type: "upsertTask", task: result.followUp });
      toast.success(`Added ${result.application.company}`);
      void refreshActivity();
      return result.application;
    },
    [services, refreshActivity],
  );

  const editApplication = useCallback<JobDataContextValue["editApplication"]>(
    async (id, input) => {
      const app = findApp(id);
      const change = app && (await attempt("Couldn't save your changes", () => services().applications.edit(app, input)));
      if (!app || !change) return false;
      const ok = await commitApp(app, change, "Couldn't save your changes");
      if (ok) toast.success("Changes saved");
      return ok;
    },
    [findApp, services, commitApp],
  );

  const moveApplication = useCallback<JobDataContextValue["moveApplication"]>(
    async (id, status) => {
      const app = findApp(id);
      const change = app && services().applications.move(app, status);
      if (!app || !change) return;
      if (await commitApp(app, change, `Couldn't move ${app.company}`)) {
        toast.success(`${app.company} moved to ${STATUS_META[status].label}`);
      }
    },
    [findApp, services, commitApp],
  );

  const scheduleInterview = useCallback<JobDataContextValue["scheduleInterview"]>(
    async (id, interview) => {
      const app = findApp(id);
      if (!app) return false;
      const ok = await commitApp(app, services().applications.scheduleInterview(app, interview), "Couldn't schedule the interview");
      if (ok) toast.success(`Interview with ${app.company} scheduled`);
      return ok;
    },
    [findApp, services, commitApp],
  );

  const setArchived = useCallback<JobDataContextValue["setArchived"]>(
    async (id, archived) => {
      const app = findApp(id);
      const change = app && services().applications.setArchived(app, archived);
      if (!app || !change) return;
      const ok = await commitApp(app, change, archived ? "Couldn't archive" : "Couldn't restore");
      if (ok) toast.success(archived ? `${app.company} archived` : `${app.company} restored`);
    },
    [findApp, services, commitApp],
  );

  const deleteApplication = useCallback<JobDataContextValue["deleteApplication"]>(
    async (id) => {
      const app = findApp(id);
      const done = await attempt("Couldn't delete the application", async () => {
        await services().applications.remove(id);
        return true;
      });
      if (!done) return false;
      dispatch({ type: "removeApp", id });
      toast.success(app ? `Deleted ${app.company}` : "Application deleted");
      return true;
    },
    [findApp, services],
  );

  const addFollowUp = useCallback<JobDataContextValue["addFollowUp"]>(
    async (input) => {
      const task = await attempt("Couldn't add the follow-up", () => services().followUps.add(input));
      if (!task) return false;
      dispatch({ type: "upsertTask", task });
      toast.success("Follow-up added");
      return true;
    },
    [services],
  );

  const toggleFollowUp = useCallback<JobDataContextValue["toggleFollowUp"]>(
    async (id) => {
      const task = findTask(id);
      if (task) await commitTask(task, services().followUps.toggleCompleted(task));
    },
    [findTask, services, commitTask],
  );

  const deleteFollowUp = useCallback<JobDataContextValue["deleteFollowUp"]>(
    async (id) => {
      const previous = findTask(id);
      if (!previous) return;
      dispatch({ type: "removeTask", id });
      const done = await attempt("Couldn't delete the follow-up", async () => {
        await services().followUps.remove(id);
        return true;
      });
      if (!done) dispatch({ type: "upsertTask", task: previous });
    },
    [findTask, services],
  );

  const updateProfileName = useCallback<JobDataContextValue["updateProfileName"]>(
    async (fullName) => {
      const name = await attempt("Couldn't update your profile", () => services().workspace.renameProfile(fullName));
      if (name === undefined) return false;
      setProfile({ fullName: name });
      toast.success("Profile updated");
      return true;
    },
    [services],
  );

  const resetDemo = useCallback(async () => {
    services().resetDemoData?.();
    await reload();
    toast.success("Demo data reset");
  }, [services, reload]);

  const value = useMemo<JobDataContextValue>(
    () => ({
      ...state,
      mode,
      profile,
      reload,
      createApplication,
      editApplication,
      moveApplication,
      scheduleInterview,
      setArchived,
      deleteApplication,
      addFollowUp,
      toggleFollowUp,
      deleteFollowUp,
      updateProfileName,
      resetDemo: mode === "demo" ? resetDemo : undefined,
    }),
    [
      state,
      mode,
      profile,
      reload,
      createApplication,
      editApplication,
      moveApplication,
      scheduleInterview,
      setArchived,
      deleteApplication,
      addFollowUp,
      toggleFollowUp,
      deleteFollowUp,
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
