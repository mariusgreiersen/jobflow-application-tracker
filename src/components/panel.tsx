import type { ReactNode } from "react";
import { InfoTip } from "@/components/info-tip";
import { cn } from "@/lib/utils";

/** Card container used for dashboard sections and charts. */
export function Panel({
  title,
  description,
  explanation,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: ReactNode;
  explanation?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-2xl border bg-card shadow-xs", className)}>
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold tracking-tight">{title}</h2>
            {explanation && <InfoTip label={title}>{explanation}</InfoTip>}
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      <div className={cn("flex-1 p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
