"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Banknote,
  Briefcase,
  CalendarDays,
  CalendarPlus,
  ExternalLink,
  History,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Undo2,
  Video,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyLogo } from "@/components/applications/company-logo";
import { StatusBadge, StatusDot } from "@/components/applications/status-badge";
import { describeActivity } from "@/lib/presenters/activity";
import { STATUS_META, WORK_TYPE_LABEL } from "@/lib/presenters/status";
import { formatDateOnly, formatDateTime, formatSalary, hostname, timeAgo } from "@/lib/presenters/format";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/core/domain/types";
import { useJobData } from "@/features/jobs/job-data-provider";
import { FollowUpForm, FollowUpItem } from "@/features/followups/follow-up-components";
import { useApplicationDialogs } from "./application-dialogs";

function DetailRow({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <dt className="w-28 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm break-words">{children}</dd>
    </div>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</h3>
      {action}
    </div>
  );
}

export function ApplicationDetailSheet({
  applicationId,
  onClose,
}: {
  applicationId: string | null;
  onClose: () => void;
}) {
  const { applications, tasks, activity, moveApplication, setArchived } = useJobData();
  const { openEdit, confirmDelete } = useApplicationDialogs();
  const [addingFollowUp, setAddingFollowUp] = useState(false);

  const app = applications.find((a) => a.id === applicationId);
  const appTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.applicationId === applicationId)
        .sort((a, b) => Number(a.completedAt !== null) - Number(b.completedAt !== null) || a.dueAt.localeCompare(b.dueAt)),
    [tasks, applicationId],
  );
  const history = useMemo(
    () => activity.filter((e) => e.applicationId === applicationId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [activity, applicationId],
  );

  const salary = app ? formatSalary(app.salaryMin, app.salaryMax, app.salaryCurrency) : null;

  return (
    <Sheet
      open={Boolean(app)}
      onOpenChange={(open) => {
        if (!open) {
          setAddingFollowUp(false);
          onClose();
        }
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {app && (
          <>
            <SheetHeader className="gap-4 border-b p-6 pr-12">
              <div className="flex items-start gap-4">
                <CompanyLogo company={app.company} logoUrl={app.logoUrl} size="lg" />
                <div className="min-w-0 flex-1 space-y-1">
                  <SheetTitle className="text-lg leading-tight">{app.jobTitle}</SheetTitle>
                  <SheetDescription className="text-sm">{app.company}</SheetDescription>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <StatusBadge status={app.status} />
                    {app.archivedAt && (
                      <Badge variant="outline" className="gap-1">
                        <Archive /> Archived
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={app.status} onValueChange={(v) => void moveApplication(app.id, v as ApplicationStatus)}>
                  <SelectTrigger className="h-8 min-w-36" aria-label="Change status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        <StatusDot status={status} />
                        {STATUS_META[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => openEdit(app.id)}>
                  <Pencil /> Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="More actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {app.status !== "withdrawn" && (
                      <DropdownMenuItem onSelect={() => void moveApplication(app.id, "withdrawn")}>
                        <Undo2 /> Withdraw application
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => void setArchived(app.id, !app.archivedAt)}>
                      {app.archivedAt ? <ArchiveRestore /> : <Archive />}
                      {app.archivedAt ? "Restore from archive" : "Archive"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => confirmDelete(app.id)}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SheetHeader>

            <div className="space-y-7 p-6">
              <section>
                <SectionTitle>Details</SectionTitle>
                <dl className="divide-y divide-border/60">
                  <DetailRow icon={MapPin} label="Location">
                    {app.location ?? "—"}
                    {app.workType && <span className="text-muted-foreground"> · {WORK_TYPE_LABEL[app.workType]}</span>}
                  </DetailRow>
                  <DetailRow icon={CalendarDays} label="Applied">
                    {formatDateOnly(app.dateApplied)}
                  </DetailRow>
                  <DetailRow icon={Banknote} label="Salary">
                    {salary ?? "—"}
                  </DetailRow>
                  <DetailRow icon={Briefcase} label="Job posting">
                    {app.jobUrl ? (
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {hostname(app.jobUrl) ?? "Open posting"}
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </DetailRow>
                </dl>
              </section>

              <section>
                <SectionTitle
                  action={
                    <Button variant="ghost" size="sm" onClick={() => openEdit(app.id)}>
                      <CalendarPlus /> {app.interviewAt ? "Reschedule" : "Schedule"}
                    </Button>
                  }
                >
                  Interview
                </SectionTitle>
                {app.interviewAt ? (
                  <div className="rounded-xl border bg-violet-500/5 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Video className="size-4 text-violet-600 dark:text-violet-300" />
                      {formatDateTime(app.interviewAt)}
                    </p>
                    {app.interviewNotes ? (
                      <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{app.interviewNotes}</p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No preparation notes yet.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No interview scheduled.</p>
                )}
              </section>

              <section>
                <SectionTitle
                  action={
                    !addingFollowUp && (
                      <Button variant="ghost" size="sm" onClick={() => setAddingFollowUp(true)}>
                        <CalendarPlus /> Add
                      </Button>
                    )
                  }
                >
                  Follow-ups
                </SectionTitle>
                {addingFollowUp && (
                  <div className="mb-3 rounded-xl border bg-muted/40 p-3">
                    <FollowUpForm applicationId={app.id} compact onDone={() => setAddingFollowUp(false)} />
                  </div>
                )}
                {appTasks.length > 0 ? (
                  <ul className="-mx-2">
                    {appTasks.map((task) => (
                      <FollowUpItem key={task.id} task={task} showCompany={false} />
                    ))}
                  </ul>
                ) : (
                  !addingFollowUp && <p className="text-sm text-muted-foreground">No follow-up reminders.</p>
                )}
              </section>

              {app.notes && (
                <section>
                  <SectionTitle>Notes</SectionTitle>
                  <p className="text-sm whitespace-pre-line">{app.notes}</p>
                </section>
              )}

              <section>
                <SectionTitle>
                  <span className="inline-flex items-center gap-1.5">
                    <History className="size-3.5" /> History
                  </span>
                </SectionTitle>
                <ol className="relative ml-1.5 space-y-4 border-l pl-5">
                  {history.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute top-1.5 -left-[25px] size-2 rounded-full bg-border ring-4 ring-background" aria-hidden />
                      <p className="text-sm">{describeActivity(event)}</p>
                      <p className="text-xs text-muted-foreground" title={new Date(event.occurredAt).toLocaleString()}>
                        {timeAgo(event.occurredAt)}
                      </p>
                    </li>
                  ))}
                  <li className="relative">
                    <span className="absolute top-1.5 -left-[25px] size-2 rounded-full bg-border ring-4 ring-background" aria-hidden />
                    <p className="text-xs text-muted-foreground">
                      Created {formatDateTime(app.createdAt)} · Updated {timeAgo(app.updatedAt)}
                    </p>
                  </li>
                </ol>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
