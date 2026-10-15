"use client";

import { useMemo } from "react";
import Link from "next/link";
import { subWeeks } from "date-fns";
import {
  ArrowRight,
  BellRing,
  Briefcase,
  CalendarCheck2,
  CalendarClock,
  Clock3,
  Hourglass,
  Plus,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { LoadError, PanelSkeleton, StatsSkeleton } from "@/components/loading";
import { StatusBarChart, WeeklyBarChart } from "@/components/charts/charts";
import { CompanyLogo } from "@/components/applications/company-logo";
import { StatusDot } from "@/components/applications/status-badge";
import { describeActivity } from "@/lib/domain/activity";
import {
  applicationsPerWeek,
  computeDashboardMetrics,
  groupFollowUps,
  statusDistribution,
  upcomingInterviews,
} from "@/lib/domain/metrics";
import { formatTime, relativeDayLabel, timeAgo } from "@/lib/domain/format";
import { useJobData } from "@/features/jobs/job-data-provider";
import { useApplicationDialogs } from "@/features/applications/application-dialogs";
import { FollowUpItem } from "@/features/followups/follow-up-components";

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardView() {
  const { status, error, reload, applications, tasks, activity, profile } = useJobData();
  const { openCreate, openDetail } = useApplicationDialogs();

  const data = useMemo(() => {
    if (status !== "ready") return null;
    // Dates are computed only after client-side load, so server and client
    // never disagree about the viewer's time zone during hydration.
    const now = new Date();
    const lookup = new Map(applications.map((a) => [a.id, a]));
    const followUps = groupFollowUps(tasks, now);
    const weekAhead = now.getTime() + 7 * 24 * 60 * 60 * 1000;
    return {
      now,
      lookup,
      metrics: computeDashboardMetrics(applications, now),
      weekly: applicationsPerWeek(applications, { start: subWeeks(now, 11), end: now }),
      distribution: statusDistribution(applications.filter((a) => !a.archivedAt)),
      interviews: upcomingInterviews(applications, now).slice(0, 5),
      attention: [
        ...followUps.overdue,
        ...followUps.today,
        ...followUps.upcoming.filter((t) => new Date(t.dueAt).getTime() <= weekAhead),
      ].slice(0, 6),
      overdueCount: followUps.overdue.length,
      recent: activity.filter((e) => lookup.has(e.applicationId)).slice(0, 7),
    };
  }, [status, applications, tasks, activity]);

  const firstName = profile.fullName?.split(" ")[0];

  if (status === "error") return <LoadError message={error} onRetry={() => void reload()} />;

  return (
    <>
      <PageHeader
        title={data ? `${greeting(data.now)}${firstName ? `, ${firstName}` : ""}` : "Dashboard"}
        description={
          data && applications.length > 0
            ? `You have ${data.metrics.upcomingInterviews} upcoming interview${data.metrics.upcomingInterviews === 1 ? "" : "s"} and ${data.attention.length} follow-up${data.attention.length === 1 ? "" : "s"} this week.`
            : "Here's an overview of your job search."
        }
        actions={
          <Button className="h-9" onClick={() => openCreate()}>
            <Plus /> Quick add
          </Button>
        }
      />

      {!data ? (
        <div className="space-y-6">
          <StatsSkeleton />
          <div className="grid gap-6 xl:grid-cols-5">
            <div className="xl:col-span-3"><PanelSkeleton /></div>
            <div className="xl:col-span-2"><PanelSkeleton /></div>
          </div>
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Start tracking your job search"
          description="Add the first job you've applied to, or one you're eyeing. Your dashboard, board and analytics fill in as you go."
          action={
            <Button onClick={() => openCreate()}>
              <Plus /> Add your first application
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total applications"
              value={data.metrics.total}
              sublabel={`${data.metrics.saved} saved job${data.metrics.saved === 1 ? "" : "s"} not yet applied`}
              icon={Briefcase}
              accent="indigo"
              explanation="Every application you've sent: any status except Saved. Rejected, withdrawn and archived applications still count, because they were real applications."
            />
            <StatCard
              label="In progress"
              value={data.metrics.inProgress}
              sublabel="Applied or interviewing"
              icon={Hourglass}
              accent="sky"
              explanation="Applications with status Applied or Interview that aren't archived. Rejected, withdrawn and offer stages are excluded."
            />
            <StatCard
              label="Upcoming interviews"
              value={data.metrics.upcomingInterviews}
              sublabel={data.interviews[0] ? `Next: ${relativeDayLabel(new Date(data.interviews[0].interviewAt as string), data.now)}` : "None scheduled"}
              icon={CalendarCheck2}
              accent="violet"
              explanation="Interviews scheduled in the future on applications that aren't rejected, withdrawn or archived."
            />
            <StatCard
              label="Offers received"
              value={data.metrics.offers}
              sublabel={data.metrics.offers > 0 ? "Congratulations!" : "Keep going, it adds up"}
              icon={Trophy}
              accent="emerald"
              explanation="Applications currently at the Offer stage (archived ones excluded)."
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-5">
            <Panel
              title="Applications over time"
              description="Applications sent per week, last 12 weeks"
              explanation="Counted by each application's applied date. Saved jobs aren't included until you apply."
              className="xl:col-span-3"
            >
              <WeeklyBarChart data={data.weekly} height={240} />
            </Panel>
            <Panel
              title="Status distribution"
              description="Where your active applications stand"
              explanation="Current status of every application that isn't archived."
              className="xl:col-span-2"
            >
              <StatusBarChart data={data.distribution} height={240} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <Panel
              title="Upcoming interviews"
              action={<ViewAll href="/agenda" />}
              bodyClassName="px-3 pb-3 pt-2"
            >
              {data.interviews.length === 0 ? (
                <EmptyState compact icon={CalendarClock} title="No interviews scheduled" description="Add an interview time to any application." />
              ) : (
                <ul>
                  {data.interviews.map((app) => {
                    const at = new Date(app.interviewAt as string);
                    return (
                      <li key={app.id}>
                        <button
                          type="button"
                          onClick={() => openDetail(app.id)}
                          className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="grid w-12 shrink-0 place-items-center rounded-lg border bg-background py-1 text-center">
                            <span className="text-[10px] font-medium text-violet-600 uppercase dark:text-violet-300">
                              {at.toLocaleDateString(undefined, { month: "short" })}
                            </span>
                            <span className="text-lg leading-none font-semibold tabular-nums">{at.getDate()}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{app.company}</p>
                            <p className="truncate text-xs text-muted-foreground">{app.jobTitle}</p>
                          </div>
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <Clock3 className="size-3" />
                            {relativeDayLabel(at, data.now).split(",")[0]} · {formatTime(app.interviewAt as string)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel
              title="Needs follow-up"
              description={data.overdueCount > 0 ? `${data.overdueCount} overdue` : undefined}
              action={<ViewAll href="/agenda" />}
              bodyClassName="px-3 pb-3 pt-2"
            >
              {data.attention.length === 0 ? (
                <EmptyState compact icon={BellRing} title="You're all caught up" description="No follow-ups due in the next 7 days." />
              ) : (
                <ul>
                  {data.attention.map((task) => (
                    <FollowUpItem key={task.id} task={task} application={data.lookup.get(task.applicationId)} onOpenApplication={openDetail} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Recent activity" action={<ViewAll href="/applications" />} bodyClassName="px-3 pb-3 pt-2" className="lg:col-span-2 xl:col-span-1">
              {data.recent.length === 0 ? (
                <EmptyState compact icon={Clock3} title="No activity yet" />
              ) : (
                <ul>
                  {data.recent.map((event) => {
                    const app = data.lookup.get(event.applicationId);
                    if (!app) return null;
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => openDetail(app.id)}
                          className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <CompanyLogo company={app.company} logoUrl={app.logoUrl} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">
                              <span className="font-medium">{app.company}</span>
                              <span className="text-muted-foreground"> · {describeActivity(event)}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{timeAgo(event.occurredAt)}</p>
                          </div>
                          {event.toStatus && <StatusDot status={event.toStatus} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
      <Link href={href}>
        View all <ArrowRight />
      </Link>
    </Button>
  );
}
