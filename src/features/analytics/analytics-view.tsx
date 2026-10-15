"use client";

import { useMemo, useState } from "react";
import { format, startOfDay, subMonths, subWeeks } from "date-fns";
import { BarChart3, CalendarRange, Gauge, Plus, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { LoadError, PanelSkeleton, StatsSkeleton } from "@/components/loading";
import { ActivityLineChart, CumulativeAreaChart, StatusBarChart, WeeklyBarChart } from "@/components/charts/charts";
import {
  activityTrend,
  applicationsPerWeek,
  computeConversion,
  cumulativeApplications,
  statusDistribution,
  type DateRange,
} from "@/lib/domain/metrics";
import { formatPercent } from "@/lib/domain/format";
import { isSubmitted } from "@/lib/domain/status";
import { useJobData } from "@/features/jobs/job-data-provider";
import { useApplicationDialogs } from "@/features/applications/application-dialogs";
import { cn } from "@/lib/utils";

const RANGES = {
  "4w": { label: "4 weeks", start: (now: Date) => subWeeks(now, 4) },
  "12w": { label: "12 weeks", start: (now: Date) => subWeeks(now, 12) },
  "6m": { label: "6 months", start: (now: Date) => subMonths(now, 6) },
  all: { label: "All time", start: () => null },
} as const;
type RangeKey = keyof typeof RANGES;

export function AnalyticsView() {
  const { status, error, reload, applications, activity, tasks } = useJobData();
  const { openCreate } = useApplicationDialogs();
  const [rangeKey, setRangeKey] = useState<RangeKey>("12w");

  const data = useMemo(() => {
    if (status !== "ready") return null;
    const now = new Date();
    const range: DateRange = { start: RANGES[rangeKey].start(now), end: now };
    const startDay = range.start ? format(startOfDay(range.start), "yyyy-MM-dd") : null;
    // An application is "in range" when it was applied (or, if only saved, created) within the range.
    const inRange = applications.filter((a) => {
      if (!startDay) return true;
      const day = a.dateApplied ?? a.createdAt.slice(0, 10);
      return day >= startDay;
    });
    const weekly = applicationsPerWeek(applications, range);
    const submitted = inRange.filter((a) => isSubmitted(a.status)).length;
    return {
      conversion: computeConversion(inRange, activity),
      cumulative: cumulativeApplications(applications, range),
      weekly,
      distribution: statusDistribution(inRange),
      trend: activityTrend(activity, tasks, range),
      perWeek: weekly.length > 0 ? submitted / weekly.length : null,
      submitted,
    };
  }, [status, applications, activity, tasks, rangeKey]);

  if (status === "error") return <LoadError message={error} onRetry={() => void reload()} />;

  const rangePicker = (
    <div role="group" aria-label="Time range" className="inline-flex rounded-lg border bg-card p-0.5 shadow-xs">
      {(Object.keys(RANGES) as RangeKey[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setRangeKey(key)}
          aria-pressed={rangeKey === key}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            rangeKey === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {RANGES[key].label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Analytics"
        description="How your search is converting, based on your real application history."
        actions={rangePicker}
      />

      {!data ? (
        <div className="space-y-6">
          <StatsSkeleton />
          <div className="grid gap-6 xl:grid-cols-2">
            <PanelSkeleton />
            <PanelSkeleton />
          </div>
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No data to analyse yet"
          description="Analytics appear once you've added a few applications. Conversion rates need at least one submitted application."
          action={
            <Button onClick={() => openCreate()}>
              <Plus /> Add application
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <RateTile
              icon={Target}
              label="Interview conversion"
              value={formatPercent(data.conversion.interviewRate)}
              formula="Reached interview ÷ submitted"
              detail={`${data.conversion.reachedInterview} of ${data.conversion.submitted} submitted applications reached an interview.`}
            />
            <RateTile
              icon={Trophy}
              label="Offer conversion"
              value={formatPercent(data.conversion.offerRate)}
              formula="Received offer ÷ submitted"
              detail={`${data.conversion.reachedOffer} of ${data.conversion.submitted} submitted applications led to an offer.`}
            />
            <RateTile
              icon={Gauge}
              label="Interview → offer"
              value={formatPercent(data.conversion.interviewToOfferRate)}
              formula="Received offer ÷ reached interview"
              detail={
                data.conversion.reachedInterview > 0
                  ? `${data.conversion.reachedOffer} of ${data.conversion.reachedInterview} interview processes ended in an offer.`
                  : "Shown once an application reaches the interview stage."
              }
            />
            <RateTile
              icon={CalendarRange}
              label="Applications per week"
              value={data.perWeek === null ? "—" : data.perWeek.toFixed(1)}
              formula="Submitted ÷ weeks in range"
              detail={`${data.submitted} applications over ${data.weekly.length} week${data.weekly.length === 1 ? "" : "s"}.`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              title="Total applications over time"
              description="Running total of submitted applications at the end of each week"
              explanation="Uses each application's applied date. Earlier applications are included in the starting total."
            >
              <CumulativeAreaChart data={data.cumulative} />
            </Panel>
            <Panel
              title="Applications per week"
              description="How many applications you sent each week (Monday–Sunday)"
              explanation="Bucketed by applied date in your local time zone."
            >
              <WeeklyBarChart data={data.weekly} />
            </Panel>
            <Panel
              title="Status distribution"
              description="Current status of applications in this range, including archived"
              explanation="Every application whose applied date (or creation date, for saved jobs) falls in the selected range."
            >
              <StatusBarChart data={data.distribution} />
            </Panel>
            <Panel
              title="Activity trend"
              description="Weekly stage changes and completed follow-ups"
              explanation="Status changes come from the application history log; follow-ups count when marked done."
            >
              <ActivityLineChart data={data.trend} />
            </Panel>
          </div>

          <Panel title="How these numbers are calculated">
            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              <Definition term="Submitted">
                Any application with a status other than Saved, including rejected, withdrawn and archived ones.
              </Definition>
              <Definition term="Reached interview">
                The application is or was in the Interview or Offer stage, or has had an interview scheduled. A rejection
                after an interview still counts, using the application&apos;s history.
              </Definition>
              <Definition term="Received offer">The application is or was in the Offer stage.</Definition>
              <Definition term="Empty ranges">
                When nothing has been submitted yet, rates show “—” instead of 0%, so there is no division by zero.
              </Definition>
            </dl>
          </Panel>
        </div>
      )}
    </>
  );
}

function RateTile({
  icon: Icon,
  label,
  value,
  formula,
  detail,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  formula: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{formula}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function Definition({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium">{term}</dt>
      <dd className="mt-0.5 text-muted-foreground">{children}</dd>
    </div>
  );
}
