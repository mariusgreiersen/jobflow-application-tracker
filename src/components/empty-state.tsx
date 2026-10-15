import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-8" : "gap-3 rounded-2xl border border-dashed bg-card/50 px-6 py-16",
        className,
      )}
    >
      <div className="relative">
        <div aria-hidden className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
        <span
          className={cn(
            "relative grid place-items-center rounded-xl bg-linear-to-br from-indigo-50 to-violet-100 text-primary ring-1 ring-indigo-200/60 dark:from-indigo-500/15 dark:to-violet-500/15 dark:ring-indigo-400/20",
            compact ? "size-10" : "size-12",
          )}
        >
          <Icon className={compact ? "size-5" : "size-6"} />
        </span>
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
