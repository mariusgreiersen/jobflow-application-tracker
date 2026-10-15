import { STATUS_META } from "@/lib/domain/status";
import type { ApplicationStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function StatusDot({ status, className }: { status: ApplicationStatus; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", STATUS_META[status].dot, className)} />;
}

/** Status is always conveyed by text as well as colour. */
export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        meta.badge,
        className,
      )}
    >
      <StatusDot status={status} className="size-1.5" />
      {meta.label}
    </span>
  );
}
