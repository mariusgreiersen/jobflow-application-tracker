import { addDays, subWeeks } from "date-fns";
import {
  applicationsPerWeek,
  computeDashboardMetrics,
  groupFollowUps,
  statusDistribution,
  upcomingInterviews,
  type DashboardMetrics,
  type StatusCount,
  type WeeklyCount,
} from "@/core/domain/metrics";
import type { ActivityEvent, Application, FollowUpTask, JobSnapshot } from "@/core/domain/types";

export interface DashboardView {
  metrics: DashboardMetrics;
  /** Applications sent per week over the last `weeks` weeks. */
  weekly: WeeklyCount[];
  /** Current status of every non-archived application. */
  distribution: StatusCount[];
  nextInterviews: Application[];
  /** Overdue, due today, or due within the next 7 days. */
  needsFollowUp: FollowUpTask[];
  overdueCount: number;
  recentActivity: ActivityEvent[];
}

export const DASHBOARD_LIMITS = { weeks: 12, interviews: 5, followUps: 6, activity: 7 } as const;

/** Read model for the dashboard. */
export function buildDashboard(snapshot: JobSnapshot, now: Date, limits = DASHBOARD_LIMITS): DashboardView {
  const { applications, tasks, activity } = snapshot;
  const followUps = groupFollowUps(tasks, now);
  const horizon = addDays(now, 7).getTime();
  const ids = new Set(applications.map((a) => a.id));

  return {
    metrics: computeDashboardMetrics(applications, now),
    weekly: applicationsPerWeek(applications, { start: subWeeks(now, limits.weeks - 1), end: now }),
    distribution: statusDistribution(applications.filter((a) => !a.archivedAt)),
    nextInterviews: upcomingInterviews(applications, now).slice(0, limits.interviews),
    needsFollowUp: [
      ...followUps.overdue,
      ...followUps.today,
      ...followUps.upcoming.filter((t) => new Date(t.dueAt).getTime() <= horizon),
    ].slice(0, limits.followUps),
    overdueCount: followUps.overdue.length,
    recentActivity: activity.filter((e) => ids.has(e.applicationId)).slice(0, limits.activity),
  };
}

/** Counts shown as badges in the navigation. */
export function navigationBadges(snapshot: Pick<JobSnapshot, "applications" | "tasks">, now: Date) {
  const followUps = groupFollowUps(snapshot.tasks, now);
  return {
    followUpsDue: followUps.overdue.length + followUps.today.length,
    activeApplications: snapshot.applications.filter((a) => !a.archivedAt).length,
  };
}
