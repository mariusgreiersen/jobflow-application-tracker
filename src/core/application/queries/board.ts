import { matchesQuery } from "@/core/domain/filters";
import { BOARD_STATUSES, type Application, type BoardStatus } from "@/core/domain/types";

export function isBoardStatus(value: unknown): value is BoardStatus {
  return typeof value === "string" && (BOARD_STATUSES as readonly string[]).includes(value);
}

/** Interview column: soonest interview first. Other columns: most recently applied first. */
function compareInColumn(status: BoardStatus) {
  return (a: Application, b: Application) => {
    if (status === "interview" && a.interviewAt && b.interviewAt) return a.interviewAt.localeCompare(b.interviewAt);
    return (b.dateApplied ?? b.createdAt).localeCompare(a.dateApplied ?? a.createdAt);
  };
}

export interface BoardView {
  columns: Record<BoardStatus, Application[]>;
  /** Withdrawn applications matching the search; they have no column. */
  hiddenWithdrawn: number;
}

/** Read model for the Kanban board. Archived applications are never shown. */
export function buildBoard(applications: Application[], query = ""): BoardView {
  const columns = Object.fromEntries(BOARD_STATUSES.map((s) => [s, [] as Application[]])) as Record<
    BoardStatus,
    Application[]
  >;
  let hiddenWithdrawn = 0;
  for (const app of applications) {
    if (app.archivedAt || !matchesQuery(app, query)) continue;
    if (isBoardStatus(app.status)) columns[app.status].push(app);
    else hiddenWithdrawn += 1;
  }
  for (const status of BOARD_STATUSES) columns[status].sort(compareInColumn(status));
  return { columns, hiddenWithdrawn };
}
