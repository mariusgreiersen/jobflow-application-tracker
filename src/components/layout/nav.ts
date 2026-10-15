import { BarChart3, CalendarClock, KanbanSquare, LayoutDashboard, ListChecks, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: ListChecks },
  { href: "/board", label: "Board", icon: KanbanSquare },
  { href: "/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function isActiveNav(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
