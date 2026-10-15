import { describe, expect, it } from "vitest";
import { buildAgenda, groupByDay } from "@/core/application/queries/agenda";
import { buildAnalytics, isInRange, rangeStart } from "@/core/application/queries/analytics";
import { buildBoard } from "@/core/application/queries/board";
import { buildDashboard, navigationBadges } from "@/core/application/queries/dashboard";
import type { JobSnapshot } from "@/core/domain/types";
import { makeApp, makeEvent, makeTask } from "./fixtures";

const NOW = new Date("2026-10-15T12:00:00+02:00");
const snapshot = (overrides: Partial<JobSnapshot> = {}): JobSnapshot => ({ applications: [], tasks: [], activity: [], ...overrides });

describe("buildDashboard", () => {
  it("lists follow-ups that are overdue, due today or due within a week, overdue first", () => {
    const tasks = [
      makeTask({ id: "in-10-days", dueAt: "2026-10-25T07:00:00.000Z" }),
      makeTask({ id: "in-3-days", dueAt: "2026-10-18T07:00:00.000Z" }),
      makeTask({ id: "overdue", dueAt: "2026-10-10T07:00:00.000Z" }),
      makeTask({ id: "done", dueAt: "2026-10-16T07:00:00.000Z", completedAt: "2026-10-14T07:00:00.000Z" }),
    ];
    const view = buildDashboard(snapshot({ tasks }), NOW);
    expect(view.needsFollowUp.map((t) => t.id)).toEqual(["overdue", "in-3-days"]);
    expect(view.overdueCount).toBe(1);
  });

  it("covers exactly 12 weeks and excludes archived applications from the distribution", () => {
    const view = buildDashboard(
      snapshot({ applications: [makeApp({ status: "offer" }), makeApp({ status: "offer", archivedAt: "2026-10-01T00:00:00.000Z" })] }),
      NOW,
    );
    expect(view.weekly).toHaveLength(12);
    expect(view.distribution.find((d) => d.status === "offer")?.count).toBe(1);
  });

  it("only shows activity for applications that still exist, newest first, capped", () => {
    const app = makeApp({ id: "kept" });
    const activity = Array.from({ length: 10 }, (_, i) => makeEvent({ applicationId: "kept", id: `e${i}` }));
    activity.push(makeEvent({ applicationId: "deleted" }));
    const view = buildDashboard(snapshot({ applications: [app], activity }), NOW);
    expect(view.recentActivity).toHaveLength(7);
    expect(view.recentActivity.every((e) => e.applicationId === "kept")).toBe(true);
  });

  it("computes navigation badges", () => {
    const badges = navigationBadges(
      { applications: [makeApp(), makeApp({ archivedAt: "x" })], tasks: [makeTask({ dueAt: "2026-10-01T07:00:00.000Z" })] },
      NOW,
    );
    expect(badges).toEqual({ followUpsDue: 1, activeApplications: 1 });
  });
});

describe("buildAnalytics", () => {
  it("defines range membership by applied date, or created date for saved jobs", () => {
    const start = rangeStart("4w", NOW) as Date;
    expect(isInRange(makeApp({ dateApplied: "2026-10-01" }), start)).toBe(true);
    expect(isInRange(makeApp({ dateApplied: "2026-08-01" }), start)).toBe(false);
    expect(isInRange(makeApp({ status: "saved", dateApplied: null, createdAt: "2026-10-10T08:00:00.000Z" }), start)).toBe(true);
    expect(isInRange(makeApp({ dateApplied: "2020-01-01" }), rangeStart("all", NOW))).toBe(true);
  });

  it("scopes conversion to the selected range and reports applications per week", () => {
    const apps = [
      makeApp({ status: "interview", dateApplied: "2026-10-05" }),
      makeApp({ status: "applied", dateApplied: "2026-10-06" }),
      makeApp({ status: "offer", dateApplied: "2026-05-01" }), // outside 4 weeks
    ];
    const view = buildAnalytics(snapshot({ applications: apps }), "4w", NOW);
    expect(view.submitted).toBe(2);
    expect(view.conversion.interviewRate).toBeCloseTo(0.5);
    expect(view.conversion.reachedOffer).toBe(0);
    expect(view.perWeek).toBeCloseTo(2 / view.weekly.length);
    expect(buildAnalytics(snapshot({ applications: apps }), "all", NOW).conversion.reachedOffer).toBe(1);
  });

  it("handles an empty workspace without dividing by zero", () => {
    const view = buildAnalytics(snapshot(), "all", NOW);
    expect(view.conversion.interviewRate).toBeNull();
    expect(view.submitted).toBe(0);
  });
});

describe("buildAgenda", () => {
  it("groups upcoming interviews by local day and lists the last two weeks separately", () => {
    const apps = [
      makeApp({ id: "tomorrow-am", status: "interview", interviewAt: "2026-10-16T07:00:00.000Z" }),
      makeApp({ id: "tomorrow-pm", status: "interview", interviewAt: "2026-10-16T13:00:00.000Z" }),
      makeApp({ id: "next-week", status: "interview", interviewAt: "2026-10-22T07:00:00.000Z" }),
      makeApp({ id: "last-week", status: "rejected", interviewAt: "2026-10-08T07:00:00.000Z" }),
      makeApp({ id: "long-ago", status: "rejected", interviewAt: "2026-09-01T07:00:00.000Z" }),
    ];
    const view = buildAgenda({ applications: apps, tasks: [] }, NOW);
    expect(view.upcomingByDay.map((g) => [g.key, g.items.map((a) => a.id)])).toEqual([
      ["2026-10-16", ["tomorrow-am", "tomorrow-pm"]],
      ["2026-10-22", ["next-week"]],
    ]);
    expect(view.recentInterviews.map((a) => a.id)).toEqual(["last-week"]);
  });

  it("groups by the viewer's calendar day, not UTC", () => {
    // 23:30 UTC on Oct 15 is already Oct 16 in Copenhagen.
    const groups = groupByDay([{ at: "2026-10-15T23:30:00.000Z" }], (x) => x.at);
    expect(groups[0].key).toBe("2026-10-16");
  });
});

describe("buildBoard", () => {
  const apps = [
    makeApp({ id: "old", status: "applied", dateApplied: "2026-09-01" }),
    makeApp({ id: "new", status: "applied", dateApplied: "2026-10-01" }),
    makeApp({ id: "late-interview", status: "interview", interviewAt: "2026-10-30T08:00:00.000Z" }),
    makeApp({ id: "soon-interview", status: "interview", interviewAt: "2026-10-17T08:00:00.000Z" }),
    makeApp({ id: "withdrawn", status: "withdrawn" }),
    makeApp({ id: "archived", status: "applied", archivedAt: "2026-10-01T00:00:00.000Z" }),
  ];

  it("orders columns and hides archived and withdrawn applications", () => {
    const view = buildBoard(apps);
    expect(view.columns.applied.map((a) => a.id)).toEqual(["new", "old"]);
    expect(view.columns.interview.map((a) => a.id)).toEqual(["soon-interview", "late-interview"]);
    expect(view.hiddenWithdrawn).toBe(1);
    expect(Object.values(view.columns).flat().some((a) => a.id === "archived")).toBe(false);
  });

  it("filters cards by search query", () => {
    const view = buildBoard([makeApp({ company: "Northwind" }), makeApp({ company: "Contoso" })], "north");
    expect(view.columns.applied.map((a) => a.company)).toEqual(["Northwind"]);
  });
});
