"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { BellRing, CalendarClock, CalendarPlus, ChevronDown, Clock3, MapPin, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { LoadError, PanelSkeleton } from "@/components/loading";
import { CompanyLogo } from "@/components/applications/company-logo";
import { StatusBadge } from "@/components/applications/status-badge";
import { buildAgenda } from "@/core/application/queries/agenda";
import { formatTime, relativeDayLabel } from "@/lib/presenters/format";
import { WORK_TYPE_LABEL } from "@/lib/presenters/status";
import type { Application, FollowUpTask } from "@/core/domain/types";
import { useJobData } from "@/features/jobs/job-data-provider";
import { useApplicationDialogs } from "@/features/applications/application-dialogs";
import { FollowUpForm, FollowUpItem } from "@/features/followups/follow-up-components";
import { ScheduleInterviewDialog } from "./schedule-interview-dialog";
import { cn } from "@/lib/utils";

export function AgendaView() {
  const { status, error, reload, applications, tasks } = useJobData();
  const { openDetail } = useApplicationDialogs();
  const [scheduling, setScheduling] = useState(false);
  const [addingFollowUp, setAddingFollowUp] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const data = useMemo(() => {
    if (status !== "ready") return null;
    const now = new Date();
    return { now, lookup: new Map(applications.map((a) => [a.id, a])), ...buildAgenda({ applications, tasks }, now) };
  }, [status, applications, tasks]);

  const activeApps = useMemo(() => applications.filter((a) => !a.archivedAt), [applications]);

  if (status === "error") return <LoadError message={error} onRetry={() => void reload()} />;

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Interviews and follow-up reminders, in your local time. Reminders appear here and on your dashboard; JobFlow doesn't send emails."
        actions={
          <>
            <Button variant="outline" className="h-9" onClick={() => setAddingFollowUp((v) => !v)}>
              <BellRing /> Add follow-up
            </Button>
            <Button className="h-9" onClick={() => setScheduling(true)}>
              <CalendarPlus /> Schedule interview
            </Button>
          </>
        }
      />
      <ScheduleInterviewDialog open={scheduling} onOpenChange={setScheduling} />

      {!data ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3"><PanelSkeleton height={320} /></div>
          <div className="lg:col-span-2"><PanelSkeleton height={320} /></div>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <Panel title="Upcoming interviews" className="lg:col-span-3" bodyClassName="pt-3">
            {data.upcomingByDay.length === 0 ? (
              <EmptyState
                compact
                icon={CalendarClock}
                title="No upcoming interviews"
                description="When you schedule an interview it shows up here, grouped by day."
                action={
                  <Button size="sm" variant="outline" onClick={() => setScheduling(true)}>
                    <CalendarPlus /> Schedule interview
                  </Button>
                }
              />
            ) : (
              <ol className="space-y-6">
                {data.upcomingByDay.map((group) => (
                  <li key={group.key}>
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {relativeDayLabel(group.date, data.now)}
                      <span className="h-px flex-1 bg-border" aria-hidden />
                    </h4>
                    <ul className="space-y-2">
                      {group.items.map((app) => (
                        <InterviewRow key={app.id} app={app} onOpen={() => openDetail(app.id)} />
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}

            {data.recentInterviews.length > 0 && (
              <div className="mt-8">
                <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Past two weeks</h4>
                <ul className="space-y-2 opacity-75">
                  {data.recentInterviews.map((app) => (
                    <InterviewRow key={app.id} app={app} onOpen={() => openDetail(app.id)} past />
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Follow-ups" className="lg:col-span-2" bodyClassName="pt-3 space-y-5">
            {addingFollowUp && (
              <div className="rounded-xl border bg-muted/40 p-3">
                {activeApps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add an application first, then attach follow-ups to it.</p>
                ) : (
                  <FollowUpForm applications={activeApps} compact onDone={() => setAddingFollowUp(false)} />
                )}
              </div>
            )}

            <FollowUpGroup title="Overdue" tone="danger" tasks={data.followUps.overdue} lookup={data.lookup} onOpen={openDetail} />
            <FollowUpGroup title="Today" tasks={data.followUps.today} lookup={data.lookup} onOpen={openDetail} />
            <FollowUpGroup title="Upcoming" tasks={data.followUps.upcoming} lookup={data.lookup} onOpen={openDetail} />

            {data.followUps.overdue.length + data.followUps.today.length + data.followUps.upcoming.length === 0 && (
              <EmptyState compact icon={BellRing} title="No open follow-ups" description="Add reminders to check in with recruiters or send thank-you notes." />
            )}

            {data.followUps.completed.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowCompleted((v) => !v)}
                  aria-expanded={showCompleted}
                  className="flex w-full items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
                >
                  Completed ({data.followUps.completed.length})
                  <ChevronDown className={cn("size-3.5 transition-transform", showCompleted && "rotate-180")} />
                </button>
                {showCompleted && (
                  <ul className="-mx-2 mt-2">
                    {data.followUps.completed.slice(0, 20).map((task) => (
                      <FollowUpItem key={task.id} task={task} application={data.lookup.get(task.applicationId)} onOpenApplication={openDetail} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

function InterviewRow({ app, onOpen, past }: { app: Application; onOpen: () => void; past?: boolean }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-4 rounded-xl border bg-background p-3 text-left transition-all hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="w-14 shrink-0 pt-0.5 text-right">
          <p className="text-sm font-semibold tabular-nums">{formatTime(app.interviewAt as string)}</p>
          {past && <p className="text-[11px] text-muted-foreground">{format(new Date(app.interviewAt as string), "MMM d")}</p>}
        </div>
        <span className="w-px self-stretch bg-violet-500/40" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CompanyLogo company={app.company} logoUrl={app.logoUrl} size="sm" />
            <p className="font-medium">{app.company}</p>
            <StatusBadge status={app.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{app.jobTitle}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {app.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> {app.location}
              </span>
            )}
            {app.workType && (
              <span className="inline-flex items-center gap-1">
                {app.workType === "remote" ? <Video className="size-3" /> : <Clock3 className="size-3" />}
                {WORK_TYPE_LABEL[app.workType]}
              </span>
            )}
          </div>
          {app.interviewNotes && (
            <p className="mt-2 line-clamp-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">{app.interviewNotes}</p>
          )}
        </div>
      </button>
    </li>
  );
}

function FollowUpGroup({
  title,
  tasks,
  lookup,
  onOpen,
  tone,
}: {
  title: string;
  tasks: FollowUpTask[];
  lookup: Map<string, Application>;
  onOpen: (id: string) => void;
  tone?: "danger";
}) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <h4
        className={cn(
          "mb-1 text-xs font-semibold tracking-wide uppercase",
          tone === "danger" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {title} ({tasks.length})
      </h4>
      <ul className="-mx-2">
        {tasks.map((task) => (
          <FollowUpItem key={task.id} task={task} application={lookup.get(task.applicationId)} onOpenApplication={onOpen} />
        ))}
      </ul>
    </div>
  );
}
