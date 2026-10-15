import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTip } from "@/components/info-tip";
import { cn } from "@/lib/utils";

const ACCENTS = {
  indigo: "from-indigo-500/15 to-indigo-500/5 text-indigo-600 dark:text-indigo-300",
  sky: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-300",
  violet: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-300",
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-300",
} as const;

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = "indigo",
  explanation,
  loading,
}: {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  icon: LucideIcon;
  accent?: keyof typeof ACCENTS;
  explanation?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {explanation && <InfoTip label={label}>{explanation}</InfoTip>}
        </div>
        <span className={cn("grid size-9 place-items-center rounded-xl bg-linear-to-br", ACCENTS[accent])}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-16" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      )}
      {sublabel && <p className="mt-1 text-xs text-muted-foreground">{loading ? " " : sublabel}</p>}
    </div>
  );
}
