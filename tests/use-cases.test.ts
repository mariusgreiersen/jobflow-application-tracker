import { beforeEach, describe, expect, it } from "vitest";
import { ValidationError } from "@/core/application/errors";
import { makeApplicationUseCases } from "@/core/application/use-cases/application-use-cases";
import { makeAuthUseCases } from "@/core/application/use-cases/auth-use-cases";
import { makeFollowUpUseCases } from "@/core/application/use-cases/follow-up-use-cases";
import { makeWorkspaceUseCases } from "@/core/application/use-cases/workspace-use-cases";
import type { ApplicationInput } from "@/core/domain/types";
import { FakeAuthGateway, InMemoryStore } from "./fakes";
import { makeApp, makeTask } from "./fixtures";

const NOW = new Date("2026-10-15T10:00:00+02:00");
const clock = { now: () => NOW };

const input = (overrides: Partial<ApplicationInput> = {}): ApplicationInput => ({
  company: "Northwind Labs",
  jobTitle: "Graduate Software Engineer",
  logoUrl: null,
  location: null,
  workType: null,
  jobUrl: null,
  status: "applied",
  dateApplied: null,
  interviewAt: null,
  interviewNotes: null,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  notes: null,
  ...overrides,
});

let store: InMemoryStore;
beforeEach(() => {
  store = new InMemoryStore();
});

describe("application use cases", () => {
  const useCases = () => makeApplicationUseCases({ applications: store, followUps: store, clock });

  it("creates an application, stamping the applied date for submitted statuses", async () => {
    const { application, followUp } = await useCases().create(input());
    expect(application.dateApplied).toBe("2026-10-15");
    expect(followUp).toBeNull();
    const saved = await useCases().create(input({ status: "saved" }));
    expect(saved.application.dateApplied).toBeNull();
  });

  it("creates the optional follow-up reminder with a default title", async () => {
    const { application, followUp } = await useCases().create(input(), { followUpDueAt: "2026-10-20T07:00:00.000Z" });
    expect(followUp).toMatchObject({ applicationId: application.id, title: "Follow up with Northwind Labs" });
    expect(store.tasks).toHaveLength(1);
  });

  it("rejects invalid input before touching persistence", async () => {
    await expect(useCases().create(input({ company: "  " }))).rejects.toBeInstanceOf(ValidationError);
    await expect(useCases().create(input({ salaryMin: 10, salaryMax: 5 }))).rejects.toThrow(/salary/);
    expect(store.applications).toHaveLength(0);
  });

  it("returns a preview for optimistic UI and persists only on commit", async () => {
    const app = (await useCases().create(input({ status: "saved" }))).application;
    const change = useCases().move(app, "applied");
    expect(change?.preview).toMatchObject({ status: "applied", dateApplied: "2026-10-15" });
    expect(store.applications[0].status).toBe("saved"); // nothing persisted yet
    await change?.commit();
    expect(store.applications[0].status).toBe("applied");
  });

  it("returns no change for no-op moves and archive toggles", () => {
    const app = makeApp({ status: "applied", archivedAt: null });
    expect(useCases().move(app, "applied")).toBeNull();
    expect(useCases().setArchived(app, false)).toBeNull();
    expect(useCases().setArchived(app, true)?.preview.archivedAt).toBe(NOW.toISOString());
  });

  it("surfaces persistence failures from commit so the caller can roll back", async () => {
    const app = (await useCases().create(input())).application;
    store.failNextWrite = new Error("offline");
    await expect(useCases().move(app, "offer")!.commit()).rejects.toThrow("offline");
    expect(store.applications[0].status).toBe("applied");
  });

  it("moves earlier-stage applications to Interview when an interview is scheduled", () => {
    const interview = { interviewAt: "2026-10-20T08:00:00.000Z", notes: "Bring portfolio" };
    expect(useCases().scheduleInterview(makeApp({ status: "applied" }), interview).preview).toMatchObject({
      status: "interview",
      interviewAt: interview.interviewAt,
      interviewNotes: "Bring portfolio",
    });
    // An offer stays an offer; existing notes are kept when none are given.
    const offer = makeApp({ status: "offer", interviewNotes: "old notes" });
    expect(useCases().scheduleInterview(offer, { ...interview, notes: null }).preview).toMatchObject({
      status: "offer",
      interviewNotes: "old notes",
    });
  });

  it("applies the applied-date rule when editing too", () => {
    const app = makeApp({ status: "saved", dateApplied: null });
    expect(useCases().edit(app, input({ status: "interview" })).preview.dateApplied).toBe("2026-10-15");
    expect(() => useCases().edit(app, input({ jobTitle: "" }))).toThrow(ValidationError);
  });
});

describe("follow-up use cases", () => {
  const useCases = () => makeFollowUpUseCases({ followUps: store, clock });

  it("validates and trims new follow-ups", async () => {
    await expect(useCases().add({ applicationId: "a", title: " ", dueAt: NOW.toISOString() })).rejects.toBeInstanceOf(ValidationError);
    await expect(useCases().add({ applicationId: "a", title: "x", dueAt: "nope" })).rejects.toBeInstanceOf(ValidationError);
    expect((await useCases().add({ applicationId: "a", title: "  Ping  ", dueAt: NOW.toISOString() })).title).toBe("Ping");
  });

  it("toggles completion using the injected clock", () => {
    const open = makeTask({ completedAt: null });
    expect(useCases().toggleCompleted(open).preview.completedAt).toBe(NOW.toISOString());
    expect(useCases().toggleCompleted({ ...open, completedAt: "x" }).preview.completedAt).toBeNull();
  });
});

describe("workspace use cases", () => {
  const useCases = () => makeWorkspaceUseCases({ applications: store, followUps: store, activity: store, profiles: store });

  it("loads applications, follow-ups, history and profile together", async () => {
    store.applications = [makeApp()];
    store.tasks = [makeTask()];
    store.fullName = "Ada";
    const workspace = await useCases().load();
    expect(workspace.snapshot.applications).toHaveLength(1);
    expect(workspace.snapshot.tasks).toHaveLength(1);
    expect(workspace.profileName).toBe("Ada");
  });

  it("validates profile names", async () => {
    await expect(useCases().renameProfile("   ")).rejects.toBeInstanceOf(ValidationError);
    await expect(useCases().renameProfile("x".repeat(101))).rejects.toBeInstanceOf(ValidationError);
    expect(await useCases().renameProfile("  Ada Lovelace ")).toBe("Ada Lovelace");
    expect(store.fullName).toBe("Ada Lovelace");
  });
});

describe("auth use cases", () => {
  let auth: FakeAuthGateway;
  const useCases = () => makeAuthUseCases({ auth, siteUrl: async () => "https://jobflow.test" });
  beforeEach(() => {
    auth = new FakeAuthGateway();
  });

  it("builds the confirmation link from the site URL", async () => {
    await useCases().signUp({ fullName: "Ada", email: "a@b.co", password: "password1" });
    expect(auth.calls[0].args[0]).toMatchObject({ confirmRedirectTo: "https://jobflow.test/auth/callback?next=/dashboard" });
  });

  it("never reveals whether an email is registered when requesting a reset", async () => {
    auth.result = { ok: false, reason: "unknown", message: "User not found" };
    expect(await useCases().requestPasswordReset("nobody@b.co")).toEqual({ ok: true, value: undefined });
    auth.result = { ok: false, reason: "rate_limited" };
    expect(await useCases().requestPasswordReset("a@b.co")).toMatchObject({ ok: false, reason: "rate_limited" });
    expect(auth.calls[0].args[1]).toBe("https://jobflow.test/auth/callback?next=/reset-password");
  });

  it("only changes the password with an active session", async () => {
    expect(await useCases().changePassword("new-password")).toMatchObject({ ok: false, reason: "not_authenticated" });
    expect(auth.calls).toHaveLength(0);
    auth.user = { id: "u", email: "a@b.co", fullName: null };
    expect((await useCases().changePassword("new-password")).ok).toBe(true);
  });
});

describe("pass-through use cases delegate to their ports", () => {
  it("removes applications and follow-ups and refreshes history", async () => {
    store.applications = [makeApp({ id: "a1" })];
    store.tasks = [makeTask({ id: "t1" })];
    store.activity = [];
    await makeApplicationUseCases({ applications: store, followUps: store, clock }).remove("a1");
    await makeFollowUpUseCases({ followUps: store, clock }).remove("t1");
    expect(store.applications).toHaveLength(0);
    expect(store.tasks).toHaveLength(0);
    expect(await makeWorkspaceUseCases({ applications: store, followUps: store, activity: store, profiles: store }).refreshActivity()).toEqual([]);
  });

  it("signs in, signs out, reads the user and completes email links through the gateway", async () => {
    const auth = new FakeAuthGateway();
    auth.user = { id: "u", email: "a@b.co", fullName: "Ada" };
    const useCases = makeAuthUseCases({ auth, siteUrl: async () => "https://jobflow.test" });
    expect(await useCases.currentUser()).toEqual(auth.user);
    expect((await useCases.signIn("a@b.co", "pw")).ok).toBe(true);
    await useCases.signOut();
    expect((await useCases.completeEmailLink({ code: "abc" })).ok).toBe(true);
    expect(auth.calls.map((c) => c.method)).toEqual(["signIn", "signOut", "completeEmailLink"]);
  });
});
