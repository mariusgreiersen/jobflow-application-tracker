import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, filterApplications, hasActiveFilters, matchesQuery, type ApplicationFilters } from "@/lib/domain/filters";
import { makeApp } from "./fixtures";

const apps = [
  makeApp({ id: "a", company: "Northwind Labs", jobTitle: "Graduate Software Engineer", location: "Copenhagen", workType: "hybrid", status: "interview", dateApplied: "2026-09-20", interviewAt: "2026-10-22T08:00:00.000Z" }),
  makeApp({ id: "b", company: "contoso", jobTitle: "Backend Engineer", location: "Aarhus", workType: "onsite", status: "applied", dateApplied: "2026-10-03" }),
  makeApp({ id: "c", company: "Fabrikam", jobTitle: "Perception Engineer", location: "Malmö", workType: "remote", status: "offer", dateApplied: "2026-09-01", interviewAt: "2026-10-18T08:00:00.000Z" }),
  makeApp({ id: "d", company: "Initech", jobTitle: "Frontend Engineer", location: "Remote", workType: "remote", status: "saved", dateApplied: null, createdAt: "2026-10-10T08:00:00.000Z" }),
  makeApp({ id: "e", company: "Globex", jobTitle: "Platform Engineer", location: "Berlin", workType: "hybrid", status: "rejected", dateApplied: "2026-08-15", archivedAt: "2026-09-01T08:00:00.000Z" }),
];

const run = (overrides: Partial<ApplicationFilters>) => filterApplications(apps, { ...DEFAULT_FILTERS, ...overrides }).map((a) => a.id);

describe("search", () => {
  it("matches company, title and location case-insensitively", () => {
    expect(run({ query: "NORTHWIND" })).toEqual(["a"]);
    expect(run({ query: "backend" })).toEqual(["b"]);
    expect(run({ query: "aarhus" })).toEqual(["b"]);
  });

  it("ignores accents and requires every term", () => {
    expect(matchesQuery(apps[2], "malmo")).toBe(true);
    expect(run({ query: "engineer copenhagen" })).toEqual(["a"]);
    expect(run({ query: "engineer tokyo" })).toEqual([]);
  });
});

describe("filters", () => {
  it("hides archived applications unless requested", () => {
    expect(run({})).not.toContain("e");
    expect(run({ showArchived: true })).toContain("e");
  });

  it("filters by status and work type together with search", () => {
    expect(run({ workType: "remote" })).toEqual(expect.arrayContaining(["c", "d"]));
    expect(run({ workType: "remote", status: "offer" })).toEqual(["c"]);
    expect(run({ workType: "remote", status: "offer", query: "initech" })).toEqual([]);
  });

  it("filters by an inclusive applied-date range and excludes undated saved jobs", () => {
    expect(run({ appliedFrom: "2026-09-01", appliedTo: "2026-09-20" }).sort()).toEqual(["a", "c"]);
    expect(run({ appliedFrom: "2026-10-01" })).toEqual(["b"]);
  });

  it("detects whether any filter is active", () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: "company" })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, query: "x" })).toBe(true);
  });
});

describe("sorting", () => {
  it("sorts newest first by applied date, falling back to created date", () => {
    expect(run({ sort: "newest" })).toEqual(["d", "b", "a", "c"]);
  });

  it("sorts oldest first", () => {
    expect(run({ sort: "oldest" })).toEqual(["c", "a", "b", "d"]);
  });

  it("sorts by company name case-insensitively", () => {
    expect(run({ sort: "company" })).toEqual(["b", "c", "d", "a"]);
  });

  it("puts the soonest interview first, then the rest", () => {
    expect(run({ sort: "interview" })).toEqual(["c", "a", "d", "b"]);
  });
});
