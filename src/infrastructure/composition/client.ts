import { makeApplicationUseCases, type ApplicationUseCases } from "@/core/application/use-cases/application-use-cases";
import { makeFollowUpUseCases, type FollowUpUseCases } from "@/core/application/use-cases/follow-up-use-cases";
import { makeWorkspaceUseCases, type WorkspaceUseCases } from "@/core/application/use-cases/workspace-use-cases";
import { systemClock } from "../clock";
import { DemoRepository } from "../demo/demo-repository";
import { createClient } from "../supabase/client";
import { SupabaseActivityLog } from "../supabase/supabase-activity-log";
import { SupabaseApplicationRepository } from "../supabase/supabase-application-repository";
import { SupabaseFollowUpRepository } from "../supabase/supabase-follow-up-repository";
import { SupabaseProfileRepository } from "../supabase/supabase-profile-repository";

export type DataMode = "supabase" | "demo";

export interface WorkspaceServices {
  applications: ApplicationUseCases;
  followUps: FollowUpUseCases;
  workspace: WorkspaceUseCases;
  /** Only available in demo mode: restores the sample data. */
  resetDemoData?: () => void;
}

/**
 * Browser composition root: wires the use cases to Supabase (signed-in users)
 * or to the browser-local demo store. The UI only ever sees the use cases.
 * Call it on the client only; it touches browser storage or the browser client.
 */
export function createWorkspaceServices(mode: DataMode, userId: string): WorkspaceServices {
  const clock = systemClock;

  if (mode === "demo") {
    const store = new DemoRepository({ clock, latencyMs: 150 });
    return {
      applications: makeApplicationUseCases({ applications: store, followUps: store, clock }),
      followUps: makeFollowUpUseCases({ followUps: store, clock }),
      workspace: makeWorkspaceUseCases({ applications: store, followUps: store, activity: store, profiles: store }),
      resetDemoData: () => store.reset(),
    };
  }

  const db = createClient();
  const applications = new SupabaseApplicationRepository(db, userId);
  const followUps = new SupabaseFollowUpRepository(db, userId);
  return {
    applications: makeApplicationUseCases({ applications, followUps, clock }),
    followUps: makeFollowUpUseCases({ followUps, clock }),
    workspace: makeWorkspaceUseCases({
      applications,
      followUps,
      activity: new SupabaseActivityLog(db, userId),
      profiles: new SupabaseProfileRepository(db, userId),
    }),
  };
}
