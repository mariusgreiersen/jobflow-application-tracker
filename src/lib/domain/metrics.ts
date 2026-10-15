import {
  addWeeks,
  endOfDay,
  format,
  isBefore,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { isInProgress, isSubmitted } from "./status";
import { parseDateOnly } from "./dates";
import type { ActivityEvent, Application, ApplicationStatus, FollowUpTask } from "./types";
import { APPLICATION_STATUSES } from "./types";

/**
 * Metric definitions (also documented in the README and shown in the UI):
 *
 * - Total applications: every application you have submitted, meaning any status
 *   except "saved", including rejected, withdrawn and archived ones. They were
 *   real applications, so they count. Saved jobs are reported separately.
 * - In progress: status "applied" or "interview", not archived.
 * - Upcoming interviews: interview time in the future, on an application that is
 *   not rejected, withdrawn or archived.
 * - Offers received: status "offer", not archived.
 *
 * Archived applications are excluded from the live pipeline numbers but kept in
 * totals and analytics, since they are part of the history.
 */
export interface DashboardMetrics {
  total: number;
  saved: number;
  inProgress: number;
  upcomingInterviews: number;
  offers: number;
}

const WEEK_OPTIONS = { weekStartsOn: 1 } as const; // ISO weeks start on Monday

export function isUpcomingInterview(app: Application, now: Date): boolean {
  if (!app.interviewAt || app.archivedAt) return false;
  if (app.status === "rejected" || app.status === "withdrawn") return false;
  return new Date(app.interviewAt).getTime() >= now.getTime();
}

export function computeDashboardMetrics(apps: Application[], now: Date = new Date()): DashboardMetrics {
  let total = 0;
  let saved = 0;
  let inProgress = 0;
  let upcomingInterviews = 0;
  let offers = 0;

  for (const app of apps) {
    if (isSubmitted(app.status)) total += 1;
    const active = !app.archivedAt;
    if (active && app.status === "saved") saved += 1;
    if (active && isInProgress(app.status)) inProgress += 1;
    if (active && app.status === "offer") offers += 1;
    if (isUpcomingInterview(app, now)) upcomingInterviews += 1;
  }

  return { total, saved, inProgress, upcomingInterviews, offers };
}

/** Returns numerator / denominator, or null when the denominator is zero. */
export function safeRate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export interface ConversionMetrics {
  submitted: number;
  reachedInterview: number;
  reachedOffer: number;
  /** reachedInterview / submitted */
  interviewRate: number | null;
  /** reachedOffer / submitted */
  offerRate: number | null;
  /** reachedOffer / reachedInterview */
  interviewToOfferRate: number | null;
}

/**
 * Conversion rates use the furthest stage an application has *ever* reached, not
 * only its current status. A rejection after two interviews still counts as
 * having reached the interview stage, which comes from the activity history.
 */
export function computeConversion(apps: Application[], activity: ActivityEvent[]): ConversionMetrics {
  const everReached = new Map<string, Set<ApplicationStatus>>();
  for (const event of activity) {
    if (!event.toStatus) continue;
    const set = everReached.get(event.applicationId) ?? new Set<ApplicationStatus>();
    set.add(event.toStatus);
    everReached.set(event.applicationId, set);
  }

  let submitted = 0;
  let reachedInterview = 0;
  let reachedOffer = 0;

  for (const app of apps) {
    if (!isSubmitted(app.status)) continue;
    submitted += 1;
    const history = everReached.get(app.id);
    const offer = app.status === "offer" || history?.has("offer") === true;
    const interview =
      offer || app.status === "interview" || history?.has("interview") === true || app.interviewAt !== null;
    if (interview) reachedInterview += 1;
    if (offer) reachedOffer += 1;
  }

  return {
    submitted,
    reachedInterview,
    reachedOffer,
    interviewRate: safeRate(reachedInterview, submitted),
    offerRate: safeRate(reachedOffer, submitted),
    interviewToOfferRate: safeRate(reachedOffer, reachedInterview),
  };
}

export interface StatusCount {
  status: ApplicationStatus;
  count: number;
}

export function statusDistribution(apps: Application[]): StatusCount[] {
  const counts = new Map<ApplicationStatus, number>(APPLICATION_STATUSES.map((s) => [s, 0]));
  for (const app of apps) counts.set(app.status, (counts.get(app.status) ?? 0) + 1);
  return APPLICATION_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
}

export interface WeekBucket {
  /** Monday of the week, YYYY-MM-DD. */
  weekStart: string;
  /** Short label, e.g. "Oct 6". */
  label: string;
}

/** Monday-based weeks covering [start, end], oldest first. */
export function weekBuckets(start: Date, end: Date): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  let cursor = startOfWeek(start, WEEK_OPTIONS);
  const last = startOfWeek(end, WEEK_OPTIONS);
  // Hard cap so a bad date can never produce an unbounded loop.
  for (let i = 0; !isBefore(last, cursor) && i < 520; i++) {
    buckets.push({ weekStart: format(cursor, "yyyy-MM-dd"), label: format(cursor, "MMM d") });
    cursor = addWeeks(cursor, 1);
  }
  return buckets;
}

function weekKey(date: Date): string {
  return format(startOfWeek(date, WEEK_OPTIONS), "yyyy-MM-dd");
}

export interface DateRange {
  /** Inclusive start. null = from the earliest data point. */
  start: Date | null;
  /** Inclusive end. */
  end: Date;
}

function submittedDates(apps: Application[]): Date[] {
  return apps
    .filter((app) => isSubmitted(app.status) && app.dateApplied)
    .map((app) => parseDateOnly(app.dateApplied as string));
}

function resolveStart(range: DateRange, dates: Date[]): Date {
  if (range.start) return startOfDay(range.start);
  if (dates.length === 0) return startOfDay(range.end);
  return startOfDay(new Date(Math.min(...dates.map((d) => d.getTime()))));
}

export interface WeeklyCount extends WeekBucket {
  count: number;
}

/** Number of applications submitted per week, using `dateApplied`. */
export function applicationsPerWeek(apps: Application[], range: DateRange): WeeklyCount[] {
  const dates = submittedDates(apps);
  const start = resolveStart(range, dates);
  const end = endOfDay(range.end);
  const counts = new Map<string, number>();
  for (const date of dates) {
    if (date < start || date > end) continue;
    const key = weekKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return weekBuckets(start, end).map((bucket) => ({
    ...bucket,
    count: counts.get(bucket.weekStart) ?? 0,
  }));
}

export interface CumulativeCount extends WeekBucket {
  total: number;
}

/** Running total of submitted applications at the end of each week. */
export function cumulativeApplications(apps: Application[], range: DateRange): CumulativeCount[] {
  const dates = submittedDates(apps);
  const start = resolveStart(range, dates);
  const before = dates.filter((d) => d < start).length;
  let running = before;
  return applicationsPerWeek(apps, range).map((week) => {
    running += week.count;
    return { weekStart: week.weekStart, label: week.label, total: running };
  });
}

export interface ActivityWeek extends WeekBucket {
  statusChanges: number;
  followUpsCompleted: number;
}

/** Weekly pipeline activity: stage changes and completed follow-ups. */
export function activityTrend(
  activity: ActivityEvent[],
  tasks: FollowUpTask[],
  range: DateRange,
): ActivityWeek[] {
  const changeDates = activity
    .filter((e) => e.type === "status_changed")
    .map((e) => new Date(e.occurredAt));
  const doneDates = tasks.filter((t) => t.completedAt).map((t) => new Date(t.completedAt as string));
  const start = resolveStart(range, [...changeDates, ...doneDates]);
  const end = endOfDay(range.end);

  const tally = (dates: Date[]) => {
    const map = new Map<string, number>();
    for (const date of dates) {
      if (date < start || date > end) continue;
      const key = weekKey(date);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  };
  const changes = tally(changeDates);
  const done = tally(doneDates);

  return weekBuckets(start, end).map((bucket) => ({
    ...bucket,
    statusChanges: changes.get(bucket.weekStart) ?? 0,
    followUpsCompleted: done.get(bucket.weekStart) ?? 0,
  }));
}

export function upcomingInterviews(apps: Application[], now: Date = new Date()): Application[] {
  return apps
    .filter((app) => isUpcomingInterview(app, now))
    .sort((a, b) => (a.interviewAt as string).localeCompare(b.interviewAt as string));
}

export interface FollowUpGroups {
  overdue: FollowUpTask[];
  today: FollowUpTask[];
  upcoming: FollowUpTask[];
  completed: FollowUpTask[];
}

/** Splits follow-ups by urgency relative to the viewer's local day. */
export function groupFollowUps(tasks: FollowUpTask[], now: Date = new Date()): FollowUpGroups {
  const dayStart = startOfDay(now).getTime();
  const dayEnd = endOfDay(now).getTime();
  const groups: FollowUpGroups = { overdue: [], today: [], upcoming: [], completed: [] };

  for (const task of tasks) {
    if (task.completedAt) {
      groups.completed.push(task);
      continue;
    }
    const due = new Date(task.dueAt).getTime();
    if (due < dayStart) groups.overdue.push(task);
    else if (due <= dayEnd) groups.today.push(task);
    else groups.upcoming.push(task);
  }

  const byDue = (a: FollowUpTask, b: FollowUpTask) => a.dueAt.localeCompare(b.dueAt);
  groups.overdue.sort(byDue);
  groups.today.sort(byDue);
  groups.upcoming.sort(byDue);
  groups.completed.sort((a, b) => (b.completedAt as string).localeCompare(a.completedAt as string));
  return groups;
}
