import { requireAppSession } from "@/features/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAppSession();
  return (
    <AppShell mode={session.mode} profile={session.profile}>
      {children}
    </AppShell>
  );
}
