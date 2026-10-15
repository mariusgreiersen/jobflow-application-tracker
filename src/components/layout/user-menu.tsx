"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/presenters/format";
import { useJobData } from "@/features/jobs/job-data-provider";
import { exitDemo, signOut } from "@/features/auth/actions";

export function UserAvatar({ name, className = "size-8 text-xs" }: { name: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br from-indigo-400 to-violet-500 font-semibold text-white ${className}`}
    >
      {initials(name)}
    </span>
  );
}

export function UserMenu() {
  const { profile, mode } = useJobData();
  const name = profile.fullName ?? profile.email ?? "You";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
        <UserAvatar name={name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{name}</span>
          <span className="block truncate text-xs text-sidebar-foreground/70">
            {mode === "demo" ? "Demo workspace" : profile.email}
          </span>
        </span>
        <ChevronsUpDown className="size-4 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{name}</span>
          {profile.email && <span className="block text-xs text-muted-foreground">{profile.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={mode === "demo" ? exitDemo : signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> {mode === "demo" ? "Exit demo" : "Log out"}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
