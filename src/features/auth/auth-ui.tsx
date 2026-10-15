import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthHeader({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="mb-8 space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function AuthAlert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function NotConfiguredNotice() {
  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-200">
      <p className="font-medium">Supabase isn&apos;t configured in this environment.</p>
      <p className="mt-1 text-amber-700/90 dark:text-amber-200/80">
        Accounts are disabled, but the full app works in demo mode with sample data.
      </p>
    </div>
  );
}

export function DemoLink({ className }: { className?: string }) {
  return (
    // Plain anchor: /demo is a route handler that sets a cookie, so it must not be prefetched.
    <a
      href="/demo"
      className={cn(
        "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border bg-background text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <Sparkles className="size-4 text-primary" />
      Explore the demo instead
    </a>
  );
}

export function OrDivider() {
  return (
    <div className="relative my-6 text-center text-xs text-muted-foreground">
      <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
      <span className="relative bg-background px-2">or</span>
    </div>
  );
}
