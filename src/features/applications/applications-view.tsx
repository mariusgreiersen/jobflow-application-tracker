"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowDownUp,
  Briefcase,
  CalendarClock,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton, LoadError } from "@/components/loading";
import { CompanyLogo } from "@/components/applications/company-logo";
import { StatusBadge, StatusDot } from "@/components/applications/status-badge";
import { DEFAULT_FILTERS, filterApplications, hasActiveFilters, type ApplicationFilters, type SortOption } from "@/core/domain/filters";
import { SORT_LABEL } from "@/lib/presenters/filters";
import { STATUS_META, WORK_TYPE_LABEL } from "@/lib/presenters/status";
import { formatDateOnly, formatDateTime } from "@/lib/presenters/format";
import { APPLICATION_STATUSES, WORK_TYPES, type Application } from "@/core/domain/types";
import { useJobData } from "@/features/jobs/job-data-provider";
import { useApplicationDialogs } from "./application-dialogs";

export function ApplicationsView({ initialQuery }: { initialQuery: string }) {
  const { status, error, reload, applications } = useJobData();
  const { openCreate } = useApplicationDialogs();
  const [filters, setFilters] = useState<ApplicationFilters>({ ...DEFAULT_FILTERS, query: initialQuery });
  const set = <K extends keyof ApplicationFilters>(key: K, value: ApplicationFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const results = useMemo(() => filterApplications(applications, filters), [applications, filters]);
  const archivedCount = useMemo(() => applications.filter((a) => a.archivedAt).length, [applications]);
  const filtered = hasActiveFilters(filters);

  if (status === "error") return <LoadError message={error} onRetry={() => void reload()} />;

  return (
    <>
      <PageHeader
        title="Applications"
        description={
          status === "ready"
            ? `${results.length} of ${applications.length} application${applications.length === 1 ? "" : "s"}`
            : "Loading…"
        }
        actions={
          <Button className="h-9" onClick={() => openCreate()}>
            <Plus /> Add application
          </Button>
        }
      />

      <div className="mb-4 space-y-3 rounded-2xl border bg-card p-3 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(e) => set("query", e.target.value)}
              placeholder="Search by company, job title or location"
              aria-label="Search applications"
              className="h-9 pl-9"
              type="search"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Select value={filters.status} onValueChange={(v) => set("status", v as ApplicationFilters["status"])}>
              <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {APPLICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <StatusDot status={s} /> {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.workType} onValueChange={(v) => set("workType", v as ApplicationFilters["workType"])}>
              <SelectTrigger className="h-9 w-full sm:w-36" aria-label="Filter by work type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All work types</SelectItem>
                {WORK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {WORK_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.sort} onValueChange={(v) => set("sort", v as SortOption)}>
              <SelectTrigger className="col-span-2 h-9 w-full sm:w-48" aria-label="Sort applications">
                <ArrowDownUp className="text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Applied date range</legend>
            <Label htmlFor="applied-from" className="text-muted-foreground">
              Applied
            </Label>
            <Input
              id="applied-from"
              type="date"
              aria-label="Applied from"
              value={filters.appliedFrom}
              max={filters.appliedTo || undefined}
              onChange={(e) => set("appliedFrom", e.target.value)}
              className="h-8 w-[9.5rem]"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              id="applied-to"
              type="date"
              aria-label="Applied to"
              value={filters.appliedTo}
              min={filters.appliedFrom || undefined}
              onChange={(e) => set("appliedTo", e.target.value)}
              className="h-8 w-[9.5rem]"
            />
          </fieldset>
          <div className="flex items-center gap-2">
            <Switch id="show-archived" checked={filters.showArchived} onCheckedChange={(v) => set("showArchived", v)} />
            <Label htmlFor="show-archived" className="text-muted-foreground">
              Show archived{archivedCount > 0 ? ` (${archivedCount})` : ""}
            </Label>
          </div>
          {filtered && (
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}>
              <X /> Clear filters
            </Button>
          )}
        </div>
      </div>

      {status === "loading" ? (
        <ListSkeleton />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No applications yet"
          description="Add jobs you've applied to (or want to) and track them through every stage."
          action={
            <Button onClick={() => openCreate()}>
              <Plus /> Add application
            </Button>
          }
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No applications match your filters"
          description="Try a different search term or clear the filters."
          action={
            <Button variant="outline" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}>
              <X /> Clear filters
            </Button>
          }
        />
      ) : (
        <ApplicationTable applications={results} />
      )}
    </>
  );
}

function ApplicationTable({ applications }: { applications: Application[] }) {
  const { openDetail } = useApplicationDialogs();
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <table className="w-full text-sm">
        <caption className="sr-only">Applications</caption>
        <thead className="hidden border-b bg-muted/40 text-xs text-muted-foreground md:table-header-group">
          <tr>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">Company & role</th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">Status</th>
            <th scope="col" className="hidden px-4 py-2.5 text-left font-medium lg:table-cell">Location</th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium">Applied</th>
            <th scope="col" className="hidden px-4 py-2.5 text-left font-medium xl:table-cell">Interview</th>
            <th scope="col" className="w-12 px-2 py-2.5"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {applications.map((app) => (
            <tr
              key={app.id}
              className="group cursor-pointer transition-colors hover:bg-muted/40 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:px-4 max-md:py-3"
              onClick={() => openDetail(app.id)}
            >
              <td className="px-4 py-3 max-md:w-[calc(100%-3.5rem)] max-md:p-0">
                <div className="flex items-center gap-3">
                  <CompanyLogo company={app.company} logoUrl={app.logoUrl} />
                  <div className="min-w-0">
                    {/* A real button keeps rows keyboard-accessible; the row click is a mouse convenience. */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(app.id);
                      }}
                      className="block max-w-full truncate text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {app.company}
                    </button>
                    <p className="truncate text-xs text-muted-foreground">{app.jobTitle}</p>
                  </div>
                  {app.archivedAt && <Archive className="size-3.5 shrink-0 text-muted-foreground" aria-label="Archived" />}
                </div>
              </td>
              <td className="px-4 py-3 max-md:order-last max-md:p-0 max-md:pt-2 max-md:pl-12">
                <StatusBadge status={app.status} />
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                <span className="block max-w-48 truncate">{app.location ?? "—"}</span>
                {app.workType && <span className="text-xs">{WORK_TYPE_LABEL[app.workType]}</span>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums max-md:order-last max-md:p-0 max-md:pt-2 max-md:text-xs">
                {formatDateOnly(app.dateApplied, "MMM d")}
              </td>
              <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground xl:table-cell">
                {app.interviewAt ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-violet-500" />
                    {formatDateTime(app.interviewAt)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-2 py-3 text-right max-md:p-0" onClick={(e) => e.stopPropagation()}>
                <RowActions app={app} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({ app }: { app: Application }) {
  const { setArchived } = useJobData();
  const { openEdit, confirmDelete } = useApplicationDialogs();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${app.company}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => openEdit(app.id)}>
          <Pencil /> Edit
        </DropdownMenuItem>
        {app.jobUrl && (
          <DropdownMenuItem asChild>
            <a href={app.jobUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Open posting
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void setArchived(app.id, !app.archivedAt)}>
          {app.archivedAt ? <ArchiveRestore /> : <Archive />}
          {app.archivedAt ? "Restore" : "Archive"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => confirmDelete(app.id)}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
