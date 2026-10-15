import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_STORAGE_KEY, DemoRepository } from "@/lib/data/demo-repository";
import { planStatusChange } from "@/lib/domain/status";
import { computeDashboardMetrics } from "@/lib/domain/metrics";
import { createDemoSnapshot } from "@/lib/demo/seed";
import { EMPTY_APPLICATION_FORM } from "@/lib/validations/application";
import { formToInput } from "@/features/applications/form-values";

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

describe("DemoRepository: application lifecycle", () => {
  let storage: ReturnType<typeof memoryStorage>;
  let repo: DemoRepository;

  beforeEach(() => {
    storage = memoryStorage();
    repo = new DemoRepository({ storage, now: () => NOW });
  });

  it("seeds on first load and persists to its own storage key", async () => {
    const snapshot = await repo.load();
    expect(snapshot.applications.length).toBeGreaterThan(0);
    expect([...storage.map.keys()]).toEqual([DEMO_STORAGE_KEY]);
  });

  it("creates, moves, archives and deletes an application, keeping history consistent", async () => {
    await repo.load();
    const input = formToInput({ ...EMPTY_APPLICATION_FORM, company: "Acme", jobTitle: "Engineer", status: "saved" });
    const created = await repo.createApplication(input);
    expect(created).toMatchObject({ company: "Acme", status: "saved", dateApplied: null, archivedAt: null });

    // Survives a "page refresh": a fresh repository over the same storage.
    const reopened = new DemoRepository({ storage, now: () => NOW });
    expect((await reopened.load()).applications.find((a) => a.id === created.id)).toBeDefined();

    const moved = await reopened.updateApplication(created.id, planStatusChange(created, "applied", NOW)!);
    expect(moved).toMatchObject({ status: "applied", dateApplied: "2026-10-15" });

    const task = await reopened.createTask({ applicationId: created.id, title: "Ping recruiter", dueAt: NOW.toISOString() });
    const done = await reopened.updateTask(task.id, { completedAt: NOW.toISOString() });
    expect(done.completedAt).toBe(NOW.toISOString());

    await reopened.updateApplication(created.id, { archivedAt: NOW.toISOString() });
    const history = (await reopened.listActivity()).filter((e) => e.applicationId === created.id).map((e) => e.type);
    expect(history).toEqual(expect.arrayContaining(["created", "status_changed", "archived"]));

    await reopened.deleteApplication(created.id);
    const after = await reopened.load();
    expect(after.applications.some((a) => a.id === created.id)).toBe(false);
    expect(after.tasks.some((t) => t.applicationId === created.id)).toBe(false);
    expect(after.activity.some((e) => e.applicationId === created.id)).toBe(false);
  });

  it("rejects follow-ups for unknown applications and updates to missing rows", async () => {
    await repo.load();
    await expect(repo.createTask({ applicationId: "missing", title: "x", dueAt: NOW.toISOString() })).rejects.toThrow();
    await expect(repo.updateApplication("missing", { status: "offer" })).rejects.toThrow();
  });

  it("recovers from corrupt storage by reseeding, and reset restores the sample data", async () => {
    storage.setItem(DEMO_STORAGE_KEY, "{not json");
    expect((await repo.load()).applications.length).toBeGreaterThan(0);
    const created = await repo.createApplication(formToInput({ ...EMPTY_APPLICATION_FORM, company: "Temp", jobTitle: "Role" }));
    repo.reset();
    expect((await repo.load()).applications.some((a) => a.id === created.id)).toBe(false);
  });
});
