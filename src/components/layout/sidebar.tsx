"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { navigationBadges } from "@/core/application/queries/dashboard";
import { useJobData } from "@/features/jobs/job-data-provider";
import { useApplicationDialogs } from "@/features/applications/application-dialogs";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActiveNav } from "./nav";
import { UserMenu } from "./user-menu";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { tasks, applications, status } = useJobData();
  const { openCreate } = useApplicationDialogs();

  const counts = useMemo(() => {
    const badges = navigationBadges({ applications, tasks }, new Date());
    return { "/agenda": badges.followUpsDue, "/applications": badges.activeApplications } as Record<string, number>;
  }, [tasks, applications]);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-5">
        <Logo href="/dashboard" textClassName="text-white" />
      </div>

      <div className="px-3 pb-2">
        <Button
          className="h-9 w-full justify-start bg-white/10 text-white shadow-none ring-1 ring-white/10 hover:bg-white/15"
          onClick={() => {
            openCreate();
            onNavigate?.();
          }}
        >
          <Plus /> New application
        </Button>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActiveNav(pathname, href);
          const count = status === "ready" ? counts[href] : undefined;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className={cn("size-4", active ? "text-sidebar-primary" : "opacity-70 group-hover:opacity-100")} />
              <span className="flex-1">{label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 tabular-nums",
                    href === "/agenda" ? "bg-rose-500/90 text-white" : "bg-white/10 text-sidebar-foreground",
                  )}
                  aria-label={href === "/agenda" ? `${count} follow-ups due` : `${count} applications`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <UserMenu />
      </div>
    </div>
  );
}
