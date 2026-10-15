"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STATUS_META } from "@/lib/presenters/status";
import type { ActivityWeek, CumulativeCount, StatusCount, WeeklyCount } from "@/core/domain/metrics";
import { CHART, ChartLegend, ChartTooltip, ChartWithTable } from "./chart-parts";

const AXIS_PROPS = { tickLine: false, axisLine: false, tick: CHART.axisTick } as const;
const ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: CHART.surface } as const;

/** Single-series area: no legend box needed, the panel title names the series. */
export function CumulativeAreaChart({ data, height = 260 }: { data: CumulativeCount[]; height?: number }) {
  return (
    <ChartWithTable
      caption="Total applications submitted over time, by week"
      height={height}
      rows={data}
      columns={[
        { header: "Week of", cell: (r) => r.label },
        { header: "Total applications", cell: (r) => r.total, numeric: true },
      ]}
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="fill-cumulative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.series1} stopOpacity={0.18} />
                <stop offset="100%" stopColor={CHART.series1} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={24} />
            <YAxis allowDecimals={false} {...AXIS_PROPS} width={40} />
            <Tooltip cursor={{ stroke: CHART.grid, strokeWidth: 1 }} content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              name="Applications"
              stroke={CHART.series1}
              strokeWidth={2}
              strokeLinecap="round"
              fill="url(#fill-cumulative)"
              activeDot={ACTIVE_DOT}
            />
          </AreaChart>
        </ResponsiveContainer>
      }
    />
  );
}

export function WeeklyBarChart({ data, height = 260 }: { data: WeeklyCount[]; height?: number }) {
  return (
    <ChartWithTable
      caption="Applications submitted per week"
      height={height}
      rows={data}
      columns={[
        { header: "Week of", cell: (r) => r.label },
        { header: "Applications", cell: (r) => r.count, numeric: true },
      ]}
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -12 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
            <YAxis allowDecimals={false} {...AXIS_PROPS} width={40} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltip />} />
            <Bar dataKey="count" name="Applications" fill={CHART.series1} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      }
    />
  );
}

/** Horizontal bars: status names stay readable and values sit at the bar tips. */
export function StatusBarChart({ data, height = 260 }: { data: StatusCount[]; height?: number }) {
  const rows = data.map((d) => ({ ...d, label: STATUS_META[d.status].label }));
  return (
    <ChartWithTable
      caption="Applications by current status"
      height={height}
      rows={rows}
      columns={[
        { header: "Status", cell: (r) => r.label },
        { header: "Applications", cell: (r) => r.count, numeric: true },
      ]}
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }} barCategoryGap="22%">
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis type="category" dataKey="label" {...AXIS_PROPS} width={84} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltip />} />
            <Bar dataKey="count" name="Applications" fill={CHART.series1} radius={[0, 4, 4, 0]} maxBarSize={24}>
              <LabelList dataKey="count" position="right" className="fill-foreground text-xs tabular-nums" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      }
    />
  );
}

/** Two series on one shared scale (both are weekly counts), so one axis is valid. */
export function ActivityLineChart({ data, height = 260 }: { data: ActivityWeek[]; height?: number }) {
  return (
      <ChartWithTable
        legend={
          <ChartLegend
            items={[
              { label: "Status changes", color: CHART.series1, shape: "line" },
              { label: "Follow-ups completed", color: CHART.series2, shape: "line" },
            ]}
          />
        }
        caption="Weekly activity: status changes and completed follow-ups"
        height={height}
        rows={data}
        columns={[
          { header: "Week of", cell: (r) => r.label },
          { header: "Status changes", cell: (r) => r.statusChanges, numeric: true },
          { header: "Follow-ups completed", cell: (r) => r.followUpsCompleted, numeric: true },
        ]}
        chart={
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={24} />
              <YAxis allowDecimals={false} {...AXIS_PROPS} width={40} />
              <Tooltip cursor={{ stroke: CHART.grid, strokeWidth: 1 }} content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="statusChanges"
                name="Status changes"
                stroke={CHART.series1}
                strokeWidth={2}
                dot={false}
                activeDot={ACTIVE_DOT}
              />
              <Line
                type="monotone"
                dataKey="followUpsCompleted"
                name="Follow-ups completed"
                stroke={CHART.series2}
                strokeWidth={2}
                dot={false}
                activeDot={ACTIVE_DOT}
              />
            </LineChart>
          </ResponsiveContainer>
        }
      />
  );
}
