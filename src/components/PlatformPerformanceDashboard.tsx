import {
  formatCount,
  formatDecimal,
  formatMoney,
  formatRate,
  formatRatio
} from "@/lib/dashboardFormat";

export const platformDashboardMetricNames = [
  "spend",
  "impressions",
  "clicks",
  "conversions",
  "leads",
  "conversion_value"
] as const;

export type PlatformDashboardMetricName =
  (typeof platformDashboardMetricNames)[number];

export type PlatformDashboardPlatform = "google_ads" | "meta_ads";

export type PlatformMetricInput = {
  platform: PlatformDashboardPlatform;
  metricName: PlatformDashboardMetricName;
  metricValue: number;
};

export type PlatformPerformanceDashboardRow = {
  platform: PlatformDashboardPlatform;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  conversions: number;
  leads: number;
  cpl: number | null;
  conversionValue: number;
  platformRoas: number | null;
};

export type PlatformPerformanceDashboardData = {
  rows: PlatformPerformanceDashboardRow[];
  totalSpend: number;
  totalConversionValue: number;
  blendedRoas: number | null;
  hasLeads: boolean;
};

type PlatformPerformanceDashboardProps = {
  currency?: string | null;
  metricRows: PlatformMetricInput[];
  selectedRevenue?: number | null;
};

const platformOrder: PlatformDashboardPlatform[] = ["google_ads", "meta_ads"];

export function buildPlatformPerformanceDashboard(input: {
  metricRows: PlatformMetricInput[];
  selectedRevenue?: number | null;
}): PlatformPerformanceDashboardData {
  const totals = new Map<
    PlatformDashboardPlatform,
    Omit<
      PlatformPerformanceDashboardRow,
      "ctr" | "cpc" | "cpl" | "platformRoas"
    >
  >();

  for (const metricRow of input.metricRows) {
    const current = totals.get(metricRow.platform) ?? {
      platform: metricRow.platform,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      leads: 0,
      conversionValue: 0
    };

    if (metricRow.metricName === "spend") {
      current.spend += metricRow.metricValue;
    }
    if (metricRow.metricName === "impressions") {
      current.impressions += metricRow.metricValue;
    }
    if (metricRow.metricName === "clicks") {
      current.clicks += metricRow.metricValue;
    }
    if (metricRow.metricName === "conversions") {
      current.conversions += metricRow.metricValue;
    }
    if (metricRow.metricName === "leads") {
      current.leads += metricRow.metricValue;
    }
    if (metricRow.metricName === "conversion_value") {
      current.conversionValue += metricRow.metricValue;
    }

    totals.set(metricRow.platform, current);
  }

  const rows = platformOrder
    .map((platform) => totals.get(platform))
    .filter(
      (
        row
      ): row is Omit<
        PlatformPerformanceDashboardRow,
        "ctr" | "cpc" | "cpl" | "platformRoas"
      > => Boolean(row)
    )
    .map((row) => ({
      ...row,
      ctr: divide(row.clicks, row.impressions),
      cpc: divide(row.spend, row.clicks),
      cpl: divide(row.spend, row.leads),
      platformRoas: divide(row.conversionValue, row.spend)
    }));
  const totalSpend = rows.reduce((total, row) => total + row.spend, 0);
  const totalConversionValue = rows.reduce(
    (total, row) => total + row.conversionValue,
    0
  );

  return {
    rows,
    totalSpend,
    totalConversionValue,
    blendedRoas: divide(input.selectedRevenue ?? 0, totalSpend),
    hasLeads: rows.some((row) => row.leads > 0)
  };
}

export function PlatformPerformanceDashboard({
  currency,
  metricRows,
  selectedRevenue
}: PlatformPerformanceDashboardProps) {
  const dashboard = buildPlatformPerformanceDashboard({
    metricRows,
    selectedRevenue
  });
  const { hasLeads } = dashboard;
  const columnCount = hasLeads ? 11 : 9;

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--subtle)] px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
            Media platform dashboard
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal">
            Google Ads + Meta performance
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-80">
          <SummaryStat
            label="Blended ROAS"
            value={formatRatio(dashboard.blendedRoas)}
          />
          <SummaryStat
            label="Media spend"
            value={formatMoney(dashboard.totalSpend, currency)}
          />
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead className="text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 text-right font-semibold">Spend</th>
              <th className="px-4 py-3 text-right font-semibold">
                Impressions
              </th>
              <th className="px-4 py-3 text-right font-semibold">Clicks</th>
              <th className="px-4 py-3 text-right font-semibold">CTR</th>
              <th className="px-4 py-3 text-right font-semibold">CPC</th>
              <th className="px-4 py-3 text-right font-semibold">
                Conversions
              </th>
              {hasLeads ? (
                <>
                  <th className="px-4 py-3 text-right font-semibold">Leads</th>
                  <th className="px-4 py-3 text-right font-semibold">CPL</th>
                </>
              ) : null}
              <th className="px-4 py-3 text-right font-semibold">
                Conversion value
              </th>
              <th className="px-4 py-3 text-right font-semibold">
                Platform ROAS
              </th>
            </tr>
          </thead>
          <tbody>
            {dashboard.rows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-[var(--muted)]"
                  colSpan={columnCount}
                >
                  Google Ads and Meta metrics will appear after synced metric
                  rows are available for this report period.
                </td>
              </tr>
            ) : (
              dashboard.rows.map((row) => (
                <tr
                  className="border-t border-[var(--border)]"
                  key={row.platform}
                >
                  <th className="px-4 py-3 font-semibold" scope="row">
                    {getPlatformLabel(row.platform)}
                  </th>
                  <MetricCell value={formatMoney(row.spend, currency)} />
                  <MetricCell value={formatCount(row.impressions)} />
                  <MetricCell value={formatCount(row.clicks)} />
                  <MetricCell value={formatRate(row.ctr)} />
                  <MetricCell value={formatMoney(row.cpc, currency)} />
                  <MetricCell value={formatDecimal(row.conversions)} />
                  {hasLeads ? (
                    <>
                      <MetricCell value={formatDecimal(row.leads)} />
                      <MetricCell value={formatMoney(row.cpl, currency)} />
                    </>
                  ) : null}
                  <MetricCell
                    value={formatMoney(row.conversionValue, currency)}
                  />
                  <MetricCell value={formatRatio(row.platformRoas)} />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function MetricCell({ value }: { value: string }) {
  return <td className="px-4 py-3 text-right tabular-nums">{value}</td>;
}

function getPlatformLabel(platform: PlatformDashboardPlatform) {
  if (platform === "google_ads") return "Google Ads";
  return "Meta Ads";
}

function divide(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}
