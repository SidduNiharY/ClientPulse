/**
 * Shared, dependency-free metric helpers used across the dashboard surfaces.
 * Keep this module isomorphic (no Node/Prisma imports) so client chart islands
 * and server pages can both consume it.
 */

/**
 * Resolves the revenue figure to display when an explicit `revenue` metric may
 * be absent. Imports frequently land conversion value (e.g. Google Ads) without
 * a dedicated revenue row, so fall back to conversion value in that case.
 */
export function effectiveRevenue(input: {
  revenue: number;
  conversionValue: number;
}): number {
  return input.revenue > 0 ? input.revenue : input.conversionValue;
}

/**
 * Returns an inclusive date window covering `days` calendar days ending on
 * `latestDate`. `from` is snapped to the start of its UTC day; `to` preserves
 * the exact latest timestamp so `occurredOn <= to` keeps same-day rows.
 */
export function recentWindow(
  latestDate: Date,
  days: number
): { from: Date; to: Date } {
  const span = Math.max(1, Math.floor(days));
  const from = new Date(
    Date.UTC(
      latestDate.getUTCFullYear(),
      latestDate.getUTCMonth(),
      latestDate.getUTCDate() - (span - 1)
    )
  );

  return { from, to: new Date(latestDate) };
}

export type DailyTrendInputRow = {
  date: string;
  metricName: string;
  value: number;
};

export type DailyTrendPoint = {
  date: string;
  spend: number;
  revenue: number;
};

/**
 * Collapses per-metric rows into one spend/revenue point per day, applying the
 * conversion-value revenue fallback per day, sorted by date ascending.
 */
export function buildDailyTrend(
  rows: DailyTrendInputRow[]
): DailyTrendPoint[] {
  const byDate = new Map<
    string,
    { spend: number; revenue: number; conversionValue: number }
  >();

  for (const row of rows) {
    const entry = byDate.get(row.date) ?? {
      spend: 0,
      revenue: 0,
      conversionValue: 0
    };

    if (row.metricName === "spend") {
      entry.spend += row.value;
    } else if (row.metricName === "revenue") {
      entry.revenue += row.value;
    } else if (row.metricName === "conversion_value") {
      entry.conversionValue += row.value;
    }

    byDate.set(row.date, entry);
  }

  return [...byDate.entries()]
    .map(([date, entry]) => ({
      date,
      spend: entry.spend,
      revenue: effectiveRevenue({
        revenue: entry.revenue,
        conversionValue: entry.conversionValue
      })
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
