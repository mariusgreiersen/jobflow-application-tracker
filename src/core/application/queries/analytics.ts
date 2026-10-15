import { format, startOfDay, subMonths, subWeeks } from "date-fns";
import {
  activityTrend,
  applicationsPerWeek,
  computeConversion,
  cumulativeApplications,
  statusDistribution,
  type ActivityWeek,
  type ConversionMetrics,
  type CumulativeCount,
  type DateRange,
  type StatusCount,
  type WeeklyCount,
} from "@/core/domain/metrics";
import { isSubmitted } from "@/core/domain/status";
import type { Application, JobSnapshot } from "@/core/domain/types";

export const ANALYTICS_RANGES = ["4w", "12w", "6m", "all"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export function rangeStart(range: AnalyticsRange, now: Date): Date | null {
  switch (range) {
    case "4w":
      return subWeeks(now, 4);
    case "12w":
      return subWeeks(now, 12);
    case "6m":
      return subMonths(now, 6);
    case "all":
      return null;
  }
}

/**
 * An application belongs to a range when it was applied within it, or, for
 * saved jobs with no applied date, when it was created within it.
 */
export function isInRange(app: Application, start: Date | null): boolean {
  if (!start) return true;
  const day = app.dateApplied ?? app.createdAt.slice(0, 10);
  return day >= format(startOfDay(start), "yyyy-MM-dd");
}

export interface AnalyticsView {
  conversion: ConversionMetrics;
  cumulative: CumulativeCount[];
  weekly: WeeklyCount[];
  distribution: StatusCount[];
  trend: ActivityWeek[];
  submitted: number;
  /** Submitted applications ÷ weeks in range; null when the range has no weeks. */
  perWeek: number | null;
}

/** Read model for the analytics page. */
export function buildAnalytics(snapshot: JobSnapshot, range: AnalyticsRange, now: Date): AnalyticsView {
  const { applications, activity, tasks } = snapshot;
  const dateRange: DateRange = { start: rangeStart(range, now), end: now };
  const inRange = applications.filter((a) => isInRange(a, dateRange.start));
  const weekly = applicationsPerWeek(applications, dateRange);
  const submitted = inRange.filter((a) => isSubmitted(a.status)).length;

  return {
    conversion: computeConversion(inRange, activity),
    cumulative: cumulativeApplications(applications, dateRange),
    weekly,
    distribution: statusDistribution(inRange),
    trend: activityTrend(activity, tasks, dateRange),
    submitted,
    perWeek: weekly.length > 0 ? submitted / weekly.length : null,
  };
}
