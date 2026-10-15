import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError } from "@/core/application/errors";
import { computeDashboardMetrics } from "@/core/domain/metrics";
import { DEMO_STORAGE_KEY, DemoRepository } from "@/infrastructure/demo/demo-repository";
import { createDemoSnapshot } from "@/infrastructure/demo/seed";
import { formToInput } from "@/features/applications/form-values";
import { EMPTY_APPLICATION_FORM } from "@/lib/validations/application";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

const NOW = new Date("2026-10-15T10:00:00+02:00");
const clock = { now: () => NOW };

describe("demo seed", () => {
  it("contains ~20 applications across every board status with upcoming interviews and follow-ups", () => {
    const snapshot = createDemoSnapshot(NOW);
    expect(snapshot.applications.length).toBeGreaterThanOrEqual(18);
    const statuses = new Set(snapshot.applications.map((a) => a.status));
    for (const s of ["saved", "applied", "interview", "offer", "rejected"]) expect(statuses).toContain(s);
    expect(computeDashboardMetrics(snapshot.applications, NOW).upcomingInterviews).toBeGreaterThan(0);
    expect(snapshot.tasks.some((t) => !t.completedAt)).toBe(true);
    // Every task and event points at a seeded application.
    const ids = new Set(snapshot.applications.map((a) => a.id));
    expect(snapshot.tasks.every((t) => ids.has(t.applicationId))).toBe(true);
    expect(snapshot.activity.every((e) => ids.has(e.applicationId))).toBe(true);
  });
});

/** The demo store stands in for the database, so it must honour the same contracts. */
describe("DemoRepository (port adapter)", () => {
  let storage: ReturnType<typeof memoryStorage>;
  let repo: DemoRepository;

  beforeEach(() => {
    storage = memoryStorage();
    repo = new DemoRepository({ storage, clock });
  });

  it("seeds on first read and persists under its own storage key only", async () => {
    expect((await repo.listApplications()).length).toBeGreaterThan(0);
    expect([...storage.map.keys()]).toEqual([DEMO_STORAGE_KEY]);
  });

  it("persists across instances (a page refresh) and records history like the database trigger", async () => {
    const created = await repo.createApplication(formToInput({ ...EMPTY_APPLICATION_FORM, company: "Acme", jobTitle: "Engineer", status: "saved" }));
    const reopened = new DemoRepository({ storage, clock });
    expect((await reopened.listApplications()).some((a) => a.id === created.id)).toBe(true);

    await reopened.updateApplication(created.id, { status: "applied" });
    await reopened.updateApplication(created.id, { archivedAt: NOW.toISOString() });
    const history = (await reopened.listActivity()).filter((e) => e.applicationId === created.id).map((e) => e.type);
    expect(history.sort()).toEqual(["archived", "created", "status_changed"]);
  });

  it("cascades application deletes to follow-ups and history", async () => {
    const created = await repo.createApplication(formToInput({ ...EMPTY_APPLICATION_FORM, company: "Acme", jobTitle: "Engineer" }));
    await repo.createFollowUp({ applicationId: created.id, title: "Ping", dueAt: NOW.toISOString() });
    await repo.deleteApplication(created.id);
    expect((await repo.listFollowUps()).some((t) => t.applicationId === created.id)).toBe(false);
    expect((await repo.listActivity()).some((e) => e.applicationId === created.id)).toBe(false);
  });

  it("rejects follow-ups for unknown applications, like the foreign key", async () => {
    await expect(repo.createFollowUp({ applicationId: "missing", title: "x", dueAt: NOW.toISOString() })).rejects.toBeInstanceOf(NotFoundError);
    await expect(repo.updateApplication("missing", { status: "offer" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("stores the profile name", async () => {
    await repo.updateFullName("Ada Lovelace");
    expect(await repo.getFullName()).toBe("Ada Lovelace");
  });

  it("recovers from corrupt storage by reseeding, and reset restores the sample data", async () => {
    storage.setItem(DEMO_STORAGE_KEY, "{not json");
    expect((await repo.listApplications()).length).toBeGreaterThan(0);
    const created = await repo.createApplication(formToInput({ ...EMPTY_APPLICATION_FORM, company: "Temp", jobTitle: "Role" }));
    repo.reset();
    expect((await repo.listApplications()).some((a) => a.id === created.id)).toBe(false);
  });
});
