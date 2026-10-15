import type { Metadata } from "next";
import { KanbanBoard } from "@/features/kanban/kanban-board";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return <KanbanBoard />;
}
