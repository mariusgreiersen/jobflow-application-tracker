import { describe, expect, it } from "vitest";
import { deriveActivity } from "@/core/domain/activity";
import { describeActivity } from "@/lib/presenters/activity";
import { isClosed, isInProgress, isSubmitted, planStatusChange, resolveAppliedDate } from "@/core/domain/status";
import { APPLICATION_STATUSES } from "@/core/domain/types";
import { makeApp } from "./fixtures";

const NOW = new Date("2026-10-15T10:00:00+02:00");

describe("status classification", () => {
  it("classifies every status consistently", () => {
    const table = Object.fromEntries(
      APPLICATION_STATUSES.map((s) => [s, [isSubmitted(s), isInProgress(s), isClosed(s)]]),
    );
    expect(table).toEqual({
      saved: [false, false, false],
      applied: [true, true, false],
      interview: [true, true, false],
      offer: [true, false, false],
      rejected: [true, false, true],
      withdrawn: [true, false, true],
    });
  });
});

describe("planStatusChange", () => {
  it("returns null when the status does not change", () => {
    expect(planStatusChange({ status: "applied", dateApplied: "2026-10-01" }, "applied", NOW)).toBeNull();
  });

  it("stamps today's date when a saved job is first applied to", () => {
    expect(planStatusChange({ status: "saved", dateApplied: null }, "applied", NOW)).toEqual({
      status: "applied",
      dateApplied: "2026-10-15",
    });
  });

  it("keeps an existing applied date", () => {
    expect(planStatusChange({ status: "applied", dateApplied: "2026-09-01" }, "interview", NOW)).toEqual({
      status: "interview",
    });
  });

  it("allows non-linear moves, e.g. reopening a rejected application", () => {
    expect(planStatusChange({ status: "rejected", dateApplied: "2026-09-01" }, "interview", NOW)).toEqual({
      status: "interview",
    });
  });

  it("does not clear the applied date when moving back to saved", () => {
    expect(planStatusChange({ status: "applied", dateApplied: "2026-09-01" }, "saved", NOW)).toEqual({ status: "saved" });
  });

  it("never stamps a date for saved jobs", () => {
    expect(resolveAppliedDate("saved", null, NOW)).toBeNull();
    expect(resolveAppliedDate("offer", null, NOW)).toBe("2026-10-15");
  });
});

describe("deriveActivity", () => {
  it("records creation", () => {
    const app = makeApp({ status: "saved" });
    expect(deriveActivity(null, app)).toEqual([{ applicationId: app.id, type: "created", fromStatus: null, toStatus: "saved" }]);
  });

  it("records status changes, interview scheduling and archiving together", () => {
    const before = makeApp({ status: "applied" });
    const after = { ...before, status: "interview" as const, interviewAt: "2026-10-20T08:00:00.000Z", archivedAt: "2026-10-15T08:00:00.000Z" };
    expect(deriveActivity(before, after).map((e) => e.type)).toEqual(["status_changed", "interview_scheduled", "archived"]);
    expect(deriveActivity(before, after)[0]).toMatchObject({ fromStatus: "applied", toStatus: "interview" });
  });

  it("records restoring and ignores unrelated edits", () => {
    const archived = makeApp({ archivedAt: "2026-10-10T08:00:00.000Z" });
    expect(deriveActivity(archived, { ...archived, archivedAt: null }).map((e) => e.type)).toEqual(["restored"]);
    expect(deriveActivity(archived, { ...archived, notes: "changed" })).toEqual([]);
  });

  it("describes events in plain language", () => {
    expect(describeActivity({ type: "status_changed", fromStatus: "saved", toStatus: "applied" })).toBe("Applied");
    expect(describeActivity({ type: "status_changed", fromStatus: "applied", toStatus: "interview" })).toBe(
      "Moved from Applied to Interview",
    );
    expect(describeActivity({ type: "status_changed", fromStatus: "interview", toStatus: "offer" })).toBe("Received an offer");
  });
});
