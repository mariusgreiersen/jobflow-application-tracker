import { AlertTriangle, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-8 w-14" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-4 w-56" />
      <Skeleton className="mt-6 w-full rounded-xl" style={{ height }} />
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y rounded-2xl border bg-card">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <div>
        <p className="font-medium">Couldn&apos;t load your applications</p>
        <p className="mt-1 text-sm text-muted-foreground">{message ?? "Please try again."}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RotateCcw /> Try again
      </Button>
    </div>
  );
}
