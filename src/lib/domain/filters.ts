import type { Application, ApplicationStatus, WorkType } from "./types";

export const SORT_OPTIONS = {
  newest: "Newest first",
  oldest: "Oldest first",
  company: "Company name",
  interview: "Upcoming interview",
} as const;
export type SortOption = keyof typeof SORT_OPTIONS;

export interface ApplicationFilters {
  query: string;
  status: ApplicationStatus | "all";
  workType: WorkType | "all";
  /** Inclusive YYYY-MM-DD bounds on `dateApplied`. Empty string = unbounded. */
  appliedFrom: string;
  appliedTo: string;
  showArchived: boolean;
  sort: SortOption;
}

export const DEFAULT_FILTERS: ApplicationFilters = {
  query: "",
  status: "all",
  workType: "all",
  appliedFrom: "",
  appliedTo: "",
  showArchived: false,
  sort: "newest",
};

/** True when any narrowing filter differs from the defaults (sorting excluded). */
export function hasActiveFilters(filters: ApplicationFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.status !== "all" ||
    filters.workType !== "all" ||
    filters.appliedFrom !== "" ||
    filters.appliedTo !== "" ||
    filters.showArchived
  );
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Case- and accent-insensitive match against company, job title and location. */
export function matchesQuery(app: Application, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize([app.company, app.jobTitle, app.location ?? ""].join(" "));
  return terms.every((term) => haystack.includes(term));
}

/** "Newest" uses the applied date, falling back to creation time for saved jobs. */
function recency(app: Application): string {
  return app.dateApplied ?? app.createdAt.slice(0, 10);
}

function compare(sort: SortOption) {
  return (a: Application, b: Application): number => {
    switch (sort) {
      case "newest":
        return recency(b).localeCompare(recency(a)) || b.createdAt.localeCompare(a.createdAt);
      case "oldest":
        return recency(a).localeCompare(recency(b)) || a.createdAt.localeCompare(b.createdAt);
      case "company":
        return (
          a.company.localeCompare(b.company, undefined, { sensitivity: "base" }) ||
          a.jobTitle.localeCompare(b.jobTitle)
        );
      case "interview":
        // Applications with an interview come first (soonest first); the rest keep newest order.
        if (a.interviewAt && b.interviewAt) return a.interviewAt.localeCompare(b.interviewAt);
        if (a.interviewAt) return -1;
        if (b.interviewAt) return 1;
        return recency(b).localeCompare(recency(a));
    }
  };
}

export function filterApplications(apps: Application[], filters: ApplicationFilters): Application[] {
  const result = apps.filter((app) => {
    if (!filters.showArchived && app.archivedAt) return false;
    if (filters.status !== "all" && app.status !== filters.status) return false;
    if (filters.workType !== "all" && app.workType !== filters.workType) return false;
    if (filters.appliedFrom || filters.appliedTo) {
      // A date-range filter only matches applications that have an applied date.
      if (!app.dateApplied) return false;
      if (filters.appliedFrom && app.dateApplied < filters.appliedFrom) return false;
      if (filters.appliedTo && app.dateApplied > filters.appliedTo) return false;
    }
    return matchesQuery(app, filters.query);
  });
  return result.sort(compare(filters.sort));
}
