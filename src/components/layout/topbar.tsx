"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { useApplicationDialogs } from "@/features/applications/application-dialogs";
import { useJobData } from "@/features/jobs/job-data-provider";
import { NAV_ITEMS, isActiveNav } from "./nav";
import { Sidebar } from "./sidebar";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { openCreate } = useApplicationDialogs();
  const { mode } = useJobData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = NAV_ITEMS.find((item) => isActiveNav(pathname, item.href));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
        <Menu className="size-5" />
      </Button>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 border-none p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2 lg:hidden">
        <LogoMark className="size-7" />
      </div>
      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
        <span>{mode === "demo" ? "Demo workspace" : "Workspace"}</span>
        <ChevronRight className="size-3.5 opacity-60" aria-hidden />
        <span className="font-medium text-foreground" aria-current="page">
          {current?.label}
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <form
          role="search"
          className="relative hidden md:block"
          onSubmit={(event) => {
            event.preventDefault();
            const q = query.trim();
            router.push(q ? `/applications?q=${encodeURIComponent(q)}` : "/applications");
            setQuery("");
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications…"
            aria-label="Search applications"
            className="h-9 w-56 bg-muted/50 pl-8 lg:w-72"
          />
        </form>
        <ThemeToggle />
        <Button className="h-9" onClick={() => openCreate()}>
          <Plus /> <span className="hidden sm:inline">Add application</span>
          <span className="sr-only sm:hidden">Add application</span>
        </Button>
      </div>
    </header>
  );
}
