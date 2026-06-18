"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatMoney } from "@/lib/dashboardFormat";

export type TrendPoint = {
  date: string;
  spend: number;
  revenue: number;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  currency?: string | null;
  payload?: Array<{
    dataKey?: string | number;
    name?: string | number;
    value?: number | string;
    color?: string;
  }>;
};

type TrendChartProps = {
  points: TrendPoint[];
  currency?: string | null;
  height?: number;
};

function axisDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function ChartTooltip({ active, payload, label, currency }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs shadow-[var(--shadow-soft)]">
      <p className="font-semibold text-[var(--foreground)]">{axisDate(String(label))}</p>
      <div className="mt-1 space-y-1">
        {payload.map((entry) => (
          <div className="flex items-center gap-2" key={entry.dataKey}>
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="capitalize text-[var(--muted)]">{entry.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-[var(--foreground)]">
              {formatMoney(Number(entry.value), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({ points, currency, height = 260 }: TrendChartProps) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No daily performance data available for this period yet.
      </p>
    );
  }

  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer>
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="trendSpend" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--signal)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--signal)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="trendRevenue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={24}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickFormatter={axisDate}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickFormatter={compactNumber}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ stroke: "var(--border)" }}
          />
          <Area
            dataKey="revenue"
            fill="url(#trendRevenue)"
            name="Revenue"
            stroke="var(--accent)"
            strokeWidth={2}
            type="monotone"
          />
          <Area
            dataKey="spend"
            fill="url(#trendSpend)"
            name="Spend"
            stroke="var(--signal)"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
