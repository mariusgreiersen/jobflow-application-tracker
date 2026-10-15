"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { ArrowRightLeft, CalendarClock, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanyLogo } from "@/components/applications/company-logo";
import { StatusDot } from "@/components/applications/status-badge";
import { STATUS_META, WORK_TYPE_LABEL } from "@/lib/presenters/status";
import { formatDateOnly, formatDateTime } from "@/lib/presenters/format";
import { BOARD_STATUSES, type Application, type ApplicationStatus } from "@/core/domain/types";
import { cn } from "@/lib/utils";

interface KanbanCardProps extends HTMLAttributes<HTMLDivElement> {
  app: Application;
  onOpen?: () => void;
  onMove?: (status: ApplicationStatus) => void;
  /** Rendered inside the drag overlay: lifted look, no interactive controls. */
  overlay?: boolean;
  dragging?: boolean;
}

export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(function KanbanCard(
  { app, onOpen, onMove, overlay, dragging, className, ...props },
  ref,
) {
  const showInterview = app.interviewAt && (app.status === "interview" || app.status === "applied" || app.status === "offer");

  return (
    <div
      ref={ref}
      onClick={overlay ? undefined : onOpen}
      {...props}
      className={cn(
        "group relative touch-manipulation rounded-xl border bg-card p-3 text-left shadow-xs transition-[box-shadow,transform,opacity] duration-200",
        "hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        overlay && "rotate-[2deg] cursor-grabbing shadow-xl ring-2 ring-primary/40",
        dragging && "opacity-40",
        !overlay && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <CompanyLogo company={app.company} logoUrl={app.logoUrl} />
        <div className="min-w-0 flex-1">
          {/* Clicking the title opens details; the rest of the card is the drag handle. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            tabIndex={overlay ? -1 : 0}
            className="block max-w-full truncate text-left text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {app.company}
          </button>
          <p className="line-clamp-2 text-xs text-muted-foreground">{app.jobTitle}</p>
        </div>
        {!overlay && onMove && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className="-mt-1 -mr-1 opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Change status of ${app.company} (currently ${STATUS_META[app.status].label})`}
              >
                <ArrowRightLeft />
              </Button>
            </DropdownMenuTrigger>
            {/* React events bubble through portals; keep menu interactions away from the card's click/drag handlers. */}
            <DropdownMenuContent
              align="end"
              className="w-44"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">Move to</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={app.status} onValueChange={(v) => onMove(v as ApplicationStatus)}>
                {BOARD_STATUSES.map((s) => (
                  <DropdownMenuRadioItem key={s} value={s}>
                    <StatusDot status={s} /> {STATUS_META[s].label}
                  </DropdownMenuRadioItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="withdrawn">
                  <StatusDot status="withdrawn" /> Withdrawn
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {app.location && (
          <p className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{app.location}</span>
            {app.workType && <span className="shrink-0 text-muted-foreground/70">· {WORK_TYPE_LABEL[app.workType]}</span>}
          </p>
        )}
        {app.dateApplied && (
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-3 shrink-0" />
            Applied {formatDateOnly(app.dateApplied, "MMM d")}
          </p>
        )}
      </div>

      {showInterview && (
        <p className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
          <CalendarClock className="size-3 shrink-0" />
          {formatDateTime(app.interviewAt)}
        </p>
      )}

      <span className="absolute top-3 right-3 sr-only">Status: {STATUS_META[app.status].label}</span>
    </div>
  );
});
