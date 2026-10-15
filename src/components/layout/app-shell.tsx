"use client";

import type { ReactNode } from "react";
import { JobDataProvider, type DataMode } from "@/features/jobs/job-data-provider";
import { ApplicationDialogsProvider } from "@/features/applications/application-dialogs";
import type { Profile } from "@/lib/domain/types";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { DemoBanner } from "./demo-banner";

export function AppShell({ mode, profile, children }: { mode: DataMode; profile: Profile; children: ReactNode }) {
  return (
    <JobDataProvider mode={mode} profile={profile}>
      <ApplicationDialogsProvider>
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <div className="flex min-h-svh">
          <aside className="sticky top-0 hidden h-svh w-64 shrink-0 lg:block">
            <Sidebar />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            {mode === "demo" && <DemoBanner />}
            <Topbar />
            <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </main>
          </div>
        </div>
      </ApplicationDialogsProvider>
    </JobDataProvider>
  );
}
