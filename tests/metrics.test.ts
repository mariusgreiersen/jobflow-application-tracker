import { describe, expect, it } from "vitest";
import {
  activityTrend,
  applicationsPerWeek,
  computeConversion,
  computeDashboardMetrics,
  cumulativeApplications,
  groupFollowUps,
  safeRate,
  statusDistribution,
  upcomingInterviews,
} from "@/core/domain/metrics";
import { makeApp, makeEvent, makeTask } from "./fixtures";

const NOW = new Date("2026-10-15T12:00:00+02:00"); // Thursday
const FUTURE = "2026-10-20T08:00:00.000Z";
const PAST = "2026-10-01T08:00:00.000Z";

describe("computeDashboardMetrics", () => {
  const apps = [
    makeApp({ status: "saved", dateApplied: null }),
    makeApp({ status: "applied" }),
    makeApp({ status: "interview", interviewAt: FUTURE }),
    makeApp({ status: "interview", interviewAt: PAST }),
    makeApp({ status: "offer" }),
    makeApp({ status: "rejected", interviewAt: FUTURE }),
    makeApp({ status: "withdrawn" }),
    makeApp({ status: "applied", archivedAt: PAST }),
    makeApp({ status: "offer", archivedAt: PAST }),
  ];
  const metrics = computeDashboardMetrics(apps, NOW);

  it("counts every submitted application in the total, including rejected, withdrawn and archived", () => {
    expect(metrics.total).toBe(8);
    expect(metrics.saved).toBe(1);
  });

  it("counts only active applied/interview applications as in progress", () => {
    expect(metrics.inProgress).toBe(3);
  });

  it("only counts future interviews on live applications", () => {
    expect(metrics.upcomingInterviews).toBe(1);
  });

  it("excludes archived offers", () => {
    expect(metrics.offers).toBe(1);
  });

  it("handles an empty dataset", () => {
    expect(computeDashboardMetrics([], NOW)).toEqual({ total: 0, saved: 0, inProgress: 0, upcomingInterviews: 0, offers: 0 });
  });
});

describe("computeConversion", () => {
  it("returns null rates instead of dividing by zero", () => {
    const result = computeConversion([makeApp({ status: "saved", dateApplied: null })], []);
    expect(result).toMatchObject({ submitted: 0, interviewRate: null, offerRate: null, interviewToOfferRate: null });
    expect(safeRate(1, 0)).toBeNull();
  });

  it("uses history so rejections after an interview still count as reaching interview", () => {
    const rejectedAfterInterview = makeApp({ status: "rejected" });
    const offer = makeApp({ status: "offer" });
    const applied = makeApp({ status: "applied" });
    const scheduled = makeApp({ status: "applied", interviewAt: FUTURE });
    const activity = [makeEvent({ applicationId: rejectedAfterInterview.id, toStatus: "interview" })];

    const result = computeConversion([rejectedAfterInterview, offer, applied, scheduled], activity);
    expect(result.submitted).toBe(4);
    expect(result.reachedInterview).toBe(3); // rejected-after-interview, offer, scheduled
    expect(result.reachedOffer).toBe(1);
    expect(result.interviewRate).toBeCloseTo(0.75);
    expect(result.offerRate).toBeCloseTo(0.25);
    expect(result.interviewToOfferRate).toBeCloseTo(1 / 3);
  });
});

describe("time series", () => {
  const apps = [
    makeApp({ dateApplied: "2026-09-28" }), // Monday, week of Sep 28
    makeApp({ dateApplied: "2026-10-04" }), // Sunday, same week
    makeApp({ dateApplied: "2026-10-05" }), // Monday, next week
    makeApp({ dateApplied: "2026-08-01" }), // before the range
    makeApp({ status: "saved", dateApplied: null }),
  ];
  const range = { start: new Date("2026-09-28T00:00:00+02:00"), end: NOW };

  it("buckets applications into Monday-based weeks and fills gaps with zero", () => {
    expect(applicationsPerWeek(apps, range).map((w) => [w.weekStart, w.count])).toEqual([
      ["2026-09-28", 2],
      ["2026-10-05", 1],
      ["2026-10-12", 0],
    ]);
  });

  it("starts the running total from applications before the range", () => {
    expect(cumulativeApplications(apps, range).map((w) => w.total)).toEqual([3, 4, 4]);
  });

  it("starts 'all time' at the earliest application", () => {
    const weeks = applicationsPerWeek(apps, { start: null, end: NOW });
    expect(weeks[0].weekStart).toBe("2026-07-27");
    expect(weeks.reduce((sum, w) => sum + w.count, 0)).toBe(4);
  });

  it("counts status changes and completed follow-ups per week", () => {
    const trend = activityTrend(
      [makeEvent({ occurredAt: "2026-10-06T10:00:00.000Z" }), makeEvent({ type: "created", occurredAt: "2026-10-06T10:00:00.000Z" })],
      [makeTask({ completedAt: "2026-10-13T10:00:00.000Z" }), makeTask()],
      range,
    );
    expect(trend.map((w) => [w.statusChanges, w.followUpsCompleted])).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
    ]);
  });

  it("reports a count for every status", () => {
    const distribution = statusDistribution(apps);
    expect(distribution).toHaveLength(6);
    expect(distribution.find((d) => d.status === "applied")?.count).toBe(4);
  });
});

describe("agenda helpers", () => {
  it("sorts upcoming interviews chronologically", () => {
    const later = makeApp({ status: "interview", interviewAt: "2026-10-25T08:00:00.000Z" });
    const sooner = makeApp({ status: "interview", interviewAt: "2026-10-16T08:00:00.000Z" });
    expect(upcomingInterviews([later, sooner], NOW).map((a) => a.id)).toEqual([sooner.id, later.id]);
  });

  it("groups follow-ups by local day: overdue, today, upcoming, completed", () => {
    const groups = groupFollowUps(
      [
        makeTask({ id: "overdue", dueAt: "2026-10-14T07:00:00.000Z" }),
        makeTask({ id: "today-late", dueAt: "2026-10-15T20:00:00.000Z" }), // 22:00 local, still today
        makeTask({ id: "tomorrow", dueAt: "2026-10-16T07:00:00.000Z" }),
        makeTask({ id: "done", dueAt: "2026-10-01T07:00:00.000Z", completedAt: "2026-10-02T07:00:00.000Z" }),
      ],
      NOW,
    );
    expect(groups.overdue.map((t) => t.id)).toEqual(["overdue"]);
    expect(groups.today.map((t) => t.id)).toEqual(["today-late"]);
    expect(groups.upcoming.map((t) => t.id)).toEqual(["tomorrow"]);
    expect(groups.completed.map((t) => t.id)).toEqual(["done"]);
  });
});
