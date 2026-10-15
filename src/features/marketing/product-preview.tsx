import { BarChart3, CalendarClock, CalendarDays, KanbanSquare, LayoutDashboard, ListChecks, MapPin, Plus, Search } from "lucide-react";
import { CompanyLogo } from "@/components/applications/company-logo";
import { StatusDot } from "@/components/applications/status-badge";
import { LogoMark } from "@/components/logo";
import type { BoardStatus } from "@/core/domain/types";
import { STATUS_META } from "@/lib/presenters/status";

/**
 * Static illustration of the app for the landing page, built from the real UI
 * components and sample (fictional) companies. Decorative only (aria-hidden).
 */
const COLUMNS: Array<{ status: BoardStatus; cards: Array<{ company: string; title: string; location: string; meta: string; interview?: string }> }> = [
  {
    status: "applied",
    cards: [
      { company: "Hooli", title: "ML Engineer, Graduate", location: "London", meta: "Applied Oct 10" },
      { company: "Adatum Health", title: "Full-Stack Developer", location: "Copenhagen", meta: "Applied Oct 7" },
    ],
  },
  {
    status: "interview",
    cards: [
      { company: "Lamna Bank", title: "Software Engineer, Payments", location: "Copenhagen", meta: "Applied Sep 19", interview: "Tomorrow · 09:00" },
      { company: "Northwind Labs", title: "Graduate Software Engineer", location: "Copenhagen", meta: "Applied Sep 27", interview: "Fri · 10:00" },
    ],
  },
  {
    status: "offer",
    cards: [{ company: "Fabrikam Robotics", title: "Software Engineer, Perception", location: "Odense", meta: "Offer received" }],
  },
];

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: ListChecks, label: "Applications" },
  { icon: KanbanSquare, label: "Board", active: true },
  { icon: CalendarClock, label: "Agenda" },
  { icon: BarChart3, label: "Analytics" },
];

export function ProductPreview() {
  return (
    <div aria-hidden className="relative select-none">
      <div className="absolute -inset-x-8 -top-8 -bottom-8 -z-10 rounded-[2.5rem] bg-linear-to-b from-indigo-500/20 via-violet-500/10 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-indigo-950/10 ring-1 ring-black/5 dark:shadow-black/40 dark:ring-white/5">
        <div className="flex h-10 items-center gap-2 border-b bg-muted/50 px-4">
          <span className="size-2.5 rounded-full bg-rose-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="mx-auto hidden h-6 w-72 items-center justify-center rounded-md bg-background text-[11px] text-muted-foreground sm:flex">
            jobflow.app/board
          </span>
        </div>
        <div className="flex h-[440px] sm:h-[500px]">
          <div className="hidden w-48 shrink-0 flex-col bg-sidebar p-3 text-sidebar-foreground md:flex">
            <div className="flex items-center gap-2 px-2 py-2">
              <LogoMark className="size-6" />
              <span className="text-sm font-semibold text-white">JobFlow</span>
            </div>
            <div className="mt-3 flex h-8 items-center gap-2 rounded-lg bg-white/10 px-2.5 text-xs text-white ring-1 ring-white/10">
              <Plus className="size-3.5" /> New application
            </div>
            <div className="mt-3 space-y-0.5">
              {NAV.map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className={`flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-xs ${active ? "bg-sidebar-accent text-white shadow-[inset_2px_0_0_var(--sidebar-primary)]" : "opacity-75"}`}
                >
                  <Icon className={`size-3.5 ${active ? "text-sidebar-primary" : ""}`} />
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-2 rounded-lg p-2">
              <span className="grid size-7 place-items-center rounded-full bg-linear-to-br from-indigo-400 to-violet-500 text-[10px] font-semibold text-white">AD</span>
              <div className="text-[11px]">
                <p className="font-medium text-white">Alex Demo</p>
                <p className="opacity-70">Demo workspace</p>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 bg-background p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold">Board</p>
                <p className="text-xs text-muted-foreground">Drag cards between stages</p>
              </div>
              <div className="hidden h-8 w-44 items-center gap-2 rounded-lg border bg-muted/50 px-2.5 text-xs text-muted-foreground sm:flex">
                <Search className="size-3.5" /> Search applications…
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {COLUMNS.map((column, ci) => (
                <div key={column.status} className={`rounded-xl border bg-muted/40 p-2 dark:bg-muted/20 ${ci > 0 ? "hidden sm:block" : ""}`}>
                  <div className="flex items-center gap-2 px-1.5 pt-1 pb-2">
                    <StatusDot status={column.status} />
                    <span className="text-xs font-semibold">{STATUS_META[column.status].label}</span>
                    <span className="rounded-full bg-background px-1.5 text-[10px] text-muted-foreground ring-1 ring-border">
                      {column.cards.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {column.cards.map((card, i) => (
                      <div
                        key={card.company}
                        className={`rounded-lg border bg-card p-2.5 shadow-xs ${ci === 1 && i === 0 ? "rotate-[1.5deg] shadow-lg ring-2 ring-primary/30" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <CompanyLogo company={card.company} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{card.company}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{card.title}</p>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                          <p className="flex items-center gap-1"><MapPin className="size-2.5" /> {card.location}</p>
                          <p className="flex items-center gap-1"><CalendarDays className="size-2.5" /> {card.meta}</p>
                        </div>
                        {card.interview && (
                          <p className="mt-2 flex items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                            <CalendarClock className="size-2.5" /> {card.interview}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
