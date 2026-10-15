import { format, startOfDay, subDays } from "date-fns";
import { groupFollowUps, upcomingInterviews, type FollowUpGroups } from "@/core/domain/metrics";
import type { Application, JobSnapshot } from "@/core/domain/types";

export interface DayGroup<T> {
  /** Local calendar day, YYYY-MM-DD. */
  key: string;
  date: Date;
  items: T[];
}

/** Groups chronologically sorted items by local calendar day, preserving order. */
export function groupByDay<T>(items: T[], getIso: (item: T) => string): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const date = new Date(getIso(item));
    const key = format(date, "yyyy-MM-dd");
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, date: startOfDay(date), items: [item] });
  }
  return groups;
}

export const RECENT_INTERVIEW_DAYS = 14;

export interface AgendaView {
  upcomingByDay: DayGroup<Application>[];
  /** Interviews in the last two weeks, most recent first. */
  recentInterviews: Application[];
  followUps: FollowUpGroups;
}

/** Read model for the agenda page. */
export function buildAgenda(snapshot: Pick<JobSnapshot, "applications" | "tasks">, now: Date): AgendaView {
  const cutoff = subDays(now, RECENT_INTERVIEW_DAYS).getTime();
  const nowMs = now.getTime();
  return {
    upcomingByDay: groupByDay(upcomingInterviews(snapshot.applications, now), (a) => a.interviewAt as string),
    recentInterviews: snapshot.applications
      .filter((a) => {
        const at = a.interviewAt ? new Date(a.interviewAt).getTime() : Number.NaN;
        return at < nowMs && at >= cutoff;
      })
      .sort((a, b) => (b.interviewAt as string).localeCompare(a.interviewAt as string)),
    followUps: groupFollowUps(snapshot.tasks, now),
  };
}
