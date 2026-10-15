import { describe, expect, it } from "vitest";
import { initialJobState, jobReducer, type JobState } from "@/features/jobs/job-reducer";
import { makeApp, makeEvent, makeTask } from "./fixtures";

function loaded(): JobState {
  const app = makeApp({ id: "app-1", status: "applied" });
  return jobReducer(initialJobState, {
    type: "loaded",
    snapshot: {
      applications: [app, makeApp({ id: "app-2" })],
      tasks: [makeTask({ id: "t1", applicationId: "app-1" }), makeTask({ id: "t2", applicationId: "app-2" })],
      activity: [makeEvent({ applicationId: "app-1" }), makeEvent({ applicationId: "app-2" })],
    },
  });
}

describe("jobReducer", () => {
  it("applies an optimistic update and can roll it back to the previous version", () => {
    const state = loaded();
    const previous = state.applications[0];
    const optimistic = jobReducer(state, { type: "upsertApp", app: { ...previous, status: "interview" } });
    expect(optimistic.applications[0].status).toBe("interview");
    const rolledBack = jobReducer(optimistic, { type: "upsertApp", app: previous });
    expect(rolledBack.applications[0]).toEqual(previous);
  });

  it("prepends new applications", () => {
    const state = jobReducer(loaded(), { type: "upsertApp", app: makeApp({ id: "new" }) });
    expect(state.applications[0].id).toBe("new");
  });

  it("cascades deletes to follow-ups and history", () => {
    const state = jobReducer(loaded(), { type: "removeApp", id: "app-1" });
    expect(state.applications.map((a) => a.id)).toEqual(["app-2"]);
    expect(state.tasks.map((t) => t.applicationId)).toEqual(["app-2"]);
    expect(state.activity.every((e) => e.applicationId === "app-2")).toBe(true);
  });

  it("keeps data visible while reloading", () => {
    const state = jobReducer(loaded(), { type: "loading" });
    expect(state.status).toBe("ready");
    expect(jobReducer(initialJobState, { type: "loading" }).status).toBe("loading");
  });
});
