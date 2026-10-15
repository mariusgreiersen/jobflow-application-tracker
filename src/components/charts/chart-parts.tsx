"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared chart styling. Colours come from CSS tokens (--chart-1, --chart-2),
 * which are validated for colour-vision deficiency separation and 3:1 contrast
 * in both themes, so charts restyle with the theme without re-rendering.
 */
export const CHART = {
  series1: "var(--chart-1)",
  series2: "var(--chart-2)",
  grid: "var(--chart-grid)",
  surface: "var(--card)",
  axisTick: { fill: "var(--muted-foreground)", fontSize: 12 },
} as const;

export interface TooltipRow {
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
  stroke?: string;
  fill?: string;
  dataKey?: unknown;
}

/** Tooltip body: values in text ink, identity carried by the swatch beside them. */
export function ChartTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipRow>;
  label?: string | number;
  valueSuffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="mb-1.5 font-medium text-foreground">{label}</p>}
      <ul className="space-y-1">
        {payload.map((row, i) => (
          <li key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: row.color ?? row.stroke ?? row.fill }}
              />
              {row.name}
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {String(row.value)}
              {valueSuffix}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartLegend({ items }: { items: Array<{ label: string; color: string; shape?: "dot" | "line" }> }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={item.shape === "line" ? "h-0.5 w-3 rounded-full" : "size-2 rounded-full"}
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export interface TableColumn<Row> {
  header: string;
  cell: (row: Row) => ReactNode;
  numeric?: boolean;
}

/**
 * Wraps a chart with a "view as table" toggle so every value is reachable
 * without relying on colour or hover.
 */
export function ChartWithTable<Row>({
  chart,
  rows,
  columns,
  caption,
  height,
  legend,
}: {
  chart: ReactNode;
  rows: Row[];
  columns: TableColumn<Row>[];
  caption: string;
  height: number;
  legend?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <div>{legend}</div>
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          aria-label={showTable ? "Show chart" : "Show data table"}
          title={showTable ? "Show chart" : "Show data table"}
        >
          {showTable ? <BarChart3 /> : <Table2 />}
          {showTable ? "Chart" : "Table"}
        </Button>
      </div>
      {showTable ? (
        <div className="overflow-auto rounded-lg border" style={{ maxHeight: height }}>
          <table className="w-full text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                {columns.map((c) => (
                  <th key={c.header} scope="col" className={cn("px-3 py-2 text-left font-medium", c.numeric && "text-right")}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t">
                  {columns.map((c) => (
                    <td key={c.header} className={cn("px-3 py-1.5", c.numeric && "text-right tabular-nums")}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height }} role="img" aria-label={caption}>
          {chart}
        </div>
      )}
    </div>
  );
}
