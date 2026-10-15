"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { LoadError } from "@/components/loading";
import { StatusDot } from "@/components/applications/status-badge";
import { buildBoard, isBoardStatus } from "@/core/application/queries/board";
import { STATUS_META } from "@/lib/presenters/status";
import { BOARD_STATUSES, type Application, type BoardStatus } from "@/core/domain/types";
import { useJobData } from "@/features/jobs/job-data-provider";
import { useApplicationDialogs } from "@/features/applications/application-dialogs";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";

const COLUMN_STEP = 288 + 16; // column width + gap

/** Arrow keys jump a whole column at a time during a keyboard drag. */
const columnCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
  const step = { ArrowRight: COLUMN_STEP, ArrowLeft: -COLUMN_STEP } as Record<string, number>;
  if (!(event.code in step)) return undefined;
  event.preventDefault();
  return { ...currentCoordinates, x: currentCoordinates.x + step[event.code] };
};



export function KanbanBoard() {
  const { status, error, reload, applications, moveApplication } = useJobData();
  const { openCreate, openDetail } = useApplicationDialogs();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    // A small distance keeps clicks working while still starting drags quickly.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates }),
  );

  const { columns, hiddenWithdrawn: withdrawnCount } = useMemo(
    () => buildBoard(applications, query),
    [applications, query],
  );

  const byId = useMemo(() => new Map(applications.map((a) => [a.id, a])), [applications]);
  const activeApp = activeId ? byId.get(activeId) : undefined;

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${byId.get(String(active.id))?.company ?? "application"}.`,
    onDragOver: ({ active, over }) =>
      over && isBoardStatus(over.id)
        ? `${byId.get(String(active.id))?.company} is over the ${STATUS_META[over.id].label} column.`
        : `${byId.get(String(active.id))?.company} is not over a column.`,
    onDragEnd: ({ active, over }) =>
      over && isBoardStatus(over.id)
        ? `${byId.get(String(active.id))?.company} moved to ${STATUS_META[over.id].label}.`
        : "Move cancelled.",
    onDragCancel: ({ active }) => `Stopped dragging ${byId.get(String(active.id))?.company}. Move cancelled.`,
  };

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const target = event.over?.id;
    const app = byId.get(String(event.active.id));
    if (!app || !isBoardStatus(target) || app.status === target) return;
    // Optimistic: the card moves immediately and is reverted if the save fails.
    void moveApplication(app.id, target);
  }

  if (status === "error") return <LoadError message={error} onRetry={() => void reload()} />;

  return (
    <>
      <PageHeader
        title="Board"
        description="Drag cards between stages, or use a card's status menu. Changes save instantly."
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter cards…"
                aria-label="Filter board cards"
                className="h-9 w-48 pl-8"
              />
            </div>
            <Button className="h-9" onClick={() => openCreate({ status: "saved" })}>
              <Plus /> Add
            </Button>
          </>
        }
      />

      {status === "loading" ? (
        <BoardSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                "To move an application, press space or enter to pick it up, use the arrow keys to move between columns, then press space or enter to drop it. Press escape to cancel. You can also use the card's status menu.",
            },
          }}
        >
          <div className="scrollbar-thin -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            {BOARD_STATUSES.map((s) => (
              <KanbanColumn
                key={s}
                status={s}
                apps={columns[s]}
                activeId={activeId}
                onOpen={openDetail}
                onMove={(id, to) => void moveApplication(id, to)}
                onAdd={() => openCreate({ status: s })}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
            {activeApp ? <KanbanCard app={activeApp} overlay className="w-[272px]" /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {withdrawnCount > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {withdrawnCount} withdrawn application{withdrawnCount === 1 ? " is" : "s are"} hidden from the board.{" "}
          <Link href="/applications" className="text-primary hover:underline">
            View them in Applications
          </Link>
          .
        </p>
      )}
    </>
  );
}

function KanbanColumn({
  status,
  apps,
  activeId,
  onOpen,
  onMove,
  onAdd,
}: {
  status: BoardStatus;
  apps: Application[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onMove: (id: string, status: Application["status"]) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];

  return (
    <section
      aria-labelledby={`column-${status}`}
      className="flex w-[288px] shrink-0 snap-start flex-col rounded-2xl border bg-muted/40 dark:bg-muted/20"
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <StatusDot status={status} />
        <h3 id={`column-${status}`} className="text-sm font-semibold">
          {meta.label}
        </h3>
        <span className="rounded-full bg-background px-2 text-xs font-medium text-muted-foreground tabular-nums ring-1 ring-border" aria-label={`${apps.length} applications`}>
          {apps.length}
        </span>
        <Button variant="ghost" size="icon-xs" className="ml-auto text-muted-foreground" onClick={onAdd} aria-label={`Add application to ${meta.label}`}>
          <Plus />
        </Button>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-40 flex-1 flex-col gap-2.5 rounded-b-2xl p-2 transition-colors duration-150",
          isOver && "bg-primary/5 ring-2 ring-primary/30 ring-inset",
        )}
      >
        {apps.map((app) => (
          <DraggableCard key={app.id} app={app} hidden={app.id === activeId} onOpen={() => onOpen(app.id)} onMove={(to) => onMove(app.id, to)} />
        ))}
        {apps.length === 0 && (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            Drop applications here
          </div>
        )}
      </div>
    </section>
  );
}

function DraggableCard({
  app,
  hidden,
  onOpen,
  onMove,
}: {
  app: Application;
  hidden: boolean;
  onOpen: () => void;
  onMove: (status: Application["status"]) => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: app.id });
  return (
    <KanbanCard
      ref={setNodeRef}
      app={app}
      dragging={hidden}
      onOpen={onOpen}
      onMove={onMove}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable application"
      aria-label={`${app.company}, ${app.jobTitle}`}
    />
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {BOARD_STATUSES.map((s) => (
        <div key={s} className="w-[288px] shrink-0 space-y-2.5 rounded-2xl border bg-muted/40 p-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: s === "applied" ? 3 : 2 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
