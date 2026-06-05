import Link from "next/link";
import { db } from "@/server/db/client";
import { calculateRunRateForecast } from "@/server/reporting/forecasting";
import { detectOpportunities } from "@/server/reporting/opportunities";

export const dynamic = "force-dynamic";

type PortfolioMetric = {
  clientId: string;
  clientName: string;
  metricName: string;
  metricValue: number;
  occurredOn: Date;
  dimensions: Record<string, string>;
};

type PortfolioClient = {
  id: string;
  name: string;
  goals: Array<{
    goalType: string;
    targetValue: unknown;
  }>;
};

type PortfolioSummary = {
  totalSpend: number;
  totalRevenue: number;
  blendedRoas: number | null;
  mer: number | null;
  leads: number;
  cpl: number | null;
  reportsPendingApproval: number;
  failedSyncs: number;
  clientsAboveGoal: number;
  clientsBelowGoal: number;
  clientsWithBrokenData: number;
  biggestRevenueDrop: PeriodChange | null;
  biggestSpendSpike: PeriodChange | null;
  projectedSpend: number;
  projectedRevenue: number;
  projectedLeads: number;
  projectedBudgetUsage: number | null;
  opportunities: ReturnType<typeof detectOpportunities>;
};

type PeriodChange = {
  clientName: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
};

const emptySummary: PortfolioSummary = {
  totalSpend: 0,
  totalRevenue: 0,
  blendedRoas: null,
  mer: null,
  leads: 0,
  cpl: null,
  reportsPendingApproval: 0,
  failedSyncs: 0,
  clientsAboveGoal: 0,
  clientsBelowGoal: 0,
  clientsWithBrokenData: 0,
  biggestRevenueDrop: null,
  biggestSpendSpike: null,
  projectedSpend: 0,
  projectedRevenue: 0,
  projectedLeads: 0,
  projectedBudgetUsage: null,
  opportunities: []
};

async function getPortfolioSummary(): Promise<PortfolioSummary> {
  try {
    const [clients, metricRows, reports, syncRuns, connectors] =
      await Promise.all([
        db.client.findMany({
          orderBy: { name: "asc" },
          include: { goals: true, budgets: true }
        }),
        db.metricRow.findMany({
          orderBy: { occurredOn: "desc" },
          include: {
            client: {
              select: {
                name: true
              }
            }
          }
        }),
        db.report.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            client: {
              select: {
                name: true
              }
            },
            versions: {
              orderBy: { versionNumber: "desc" },
              take: 1,
              include: {
                anomalies: true,
                qualityScores: true
              }
            }
          }
        }),
        db.syncRun.findMany({
          orderBy: { startedAt: "desc" },
          take: 200
        }),
        db.connector.findMany({
          include: {
            accountMapping: {
              select: {
                clientId: true
              }
            }
          }
        })
      ]);

    const normalizedRows = metricRows.map<PortfolioMetric>((row) => ({
      clientId: row.clientId,
      clientName: row.client.name,
      metricName: row.metricName,
      metricValue: Number(row.metricValue),
      occurredOn: row.occurredOn,
      dimensions: normalizeDimensions(row.dimensions)
    }));
    const totalSpend = sumMetric(normalizedRows, "spend");
    const totalRevenue = sumMetric(normalizedRows, "revenue");
    const leads = sumMetric(normalizedRows, "leads");
    const totalBudget = clients.reduce(
      (total, client) =>
        total +
        client.budgets.reduce(
          (budgetTotal, budget) =>
            budgetTotal + Number(budget.monthlyBudget),
          0
        ),
      0
    );
    const forecast = calculateRunRateForecast({
      spendToDate: totalSpend,
      revenueToDate: totalRevenue,
      leadsToDate: leads,
      elapsedDays: countElapsedDays(normalizedRows),
      periodDays: getPortfolioPeriodDays(normalizedRows),
      budget: totalBudget > 0 ? totalBudget : null
    });
    const goalCounts = countGoalPosture(clients, normalizedRows);
    const brokenClients = new Set<string>();

    for (const run of syncRuns) {
      if (run.status === "failed") {
        brokenClients.add(run.clientId);
      }
    }

    for (const connector of connectors) {
      if (
        ["failed", "needs_authorization", "stale_data"].includes(
          connector.healthStatus
        )
      ) {
        brokenClients.add(connector.accountMapping.clientId);
      }
    }

    for (const report of reports) {
      const latestVersion = report.versions[0];
      const hasBrokenQuality = latestVersion?.qualityScores.some(
        (qualityScore) => qualityScore.rating === "poor"
      );
      const hasInternalCriticalAnomaly = latestVersion?.anomalies.some(
        (anomaly) => anomaly.severity === "critical" && !anomaly.clientSafe
      );

      if (hasBrokenQuality || hasInternalCriticalAnomaly) {
        brokenClients.add(report.clientId);
      }
    }

    return {
      totalSpend,
      totalRevenue,
      blendedRoas: divide(totalRevenue, totalSpend),
      mer: divide(totalRevenue, totalSpend),
      leads,
      cpl: divide(totalSpend, leads),
      reportsPendingApproval: reports.filter(
        (report) => report.status === "needs_review"
      ).length,
      failedSyncs:
        syncRuns.filter((run) => run.status === "failed").length +
        connectors.filter((connector) => connector.healthStatus === "failed")
          .length,
      clientsAboveGoal: goalCounts.above,
      clientsBelowGoal: goalCounts.below,
      clientsWithBrokenData: brokenClients.size,
      biggestRevenueDrop: findLargestPeriodChange(
        normalizedRows,
        "revenue",
        "drop"
      ),
      biggestSpendSpike: findLargestPeriodChange(
        normalizedRows,
        "spend",
        "spike"
      ),
      projectedSpend: forecast.projectedSpend,
      projectedRevenue: forecast.projectedRevenue,
      projectedLeads: forecast.projectedLeads,
      projectedBudgetUsage: forecast.projectedBudgetUsage,
      opportunities: detectOpportunities({
        rows: normalizedRows.map((row) => ({
          metricName: row.metricName,
          metricValue: row.metricValue,
          dimensions: row.dimensions
        }))
      }).slice(0, 5)
    };
  } catch {
    return emptySummary;
  }
}

export default async function PortfolioPage() {
  const summary = await getPortfolioSummary();
  const kpis = [
    { label: "Total spend", value: formatCurrency(summary.totalSpend) },
    { label: "Total revenue", value: formatCurrency(summary.totalRevenue) },
    { label: "Blended ROAS", value: formatRatio(summary.blendedRoas) },
    { label: "MER", value: formatRatio(summary.mer) },
    { label: "Leads", value: formatNumber(summary.leads) },
    { label: "CPL", value: formatCurrency(summary.cpl) },
    {
      label: "Reports pending approval",
      value: formatNumber(summary.reportsPendingApproval)
    },
    { label: "Failed syncs", value: formatNumber(summary.failedSyncs) },
    {
      label: "Clients above goal",
      value: formatNumber(summary.clientsAboveGoal)
    },
    {
      label: "Clients below goal",
      value: formatNumber(summary.clientsBelowGoal)
    },
    {
      label: "Clients with broken data",
      value: formatNumber(summary.clientsWithBrokenData)
    }
  ];

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
            Portfolio Intelligence
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Agency portfolio
          </h1>
        </div>
        <Link
          className="w-fit rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold transition hover:bg-[var(--hover)]"
          href="/approvals"
        >
          Review approvals
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((item) => (
          <div
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
            key={item.label}
          >
            <p className="text-sm font-medium text-[var(--muted)]">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-normal">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold tracking-normal">
            Biggest revenue drop
          </h2>
          <PeriodChangeBlock
            change={summary.biggestRevenueDrop}
            emptyLabel="No previous revenue period"
          />
        </section>
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold tracking-normal">
            Biggest spend spike
          </h2>
          <PeriodChangeBlock
            change={summary.biggestSpendSpike}
            emptyLabel="No previous spend period"
          />
        </section>
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold tracking-normal">
            Run-rate forecast
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <ForecastRow
              label="Projected spend"
              value={formatCurrency(summary.projectedSpend)}
            />
            <ForecastRow
              label="Projected revenue"
              value={formatCurrency(summary.projectedRevenue)}
            />
            <ForecastRow
              label="Projected leads"
              value={formatNumber(summary.projectedLeads)}
            />
            <ForecastRow
              label="Projected budget usage"
              value={formatPercent(summary.projectedBudgetUsage)}
            />
          </dl>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] bg-[var(--subtle)] px-4 py-3">
          <h2 className="text-lg font-semibold tracking-normal">
            Opportunity detection
          </h2>
        </div>
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Area</th>
              <th className="px-4 py-3 font-semibold">Severity</th>
              <th className="px-4 py-3 font-semibold">Signal</th>
            </tr>
          </thead>
          <tbody>
            {summary.opportunities.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={4}>
                  No portfolio opportunities detected yet.
                </td>
              </tr>
            ) : (
              summary.opportunities.map((opportunity) => (
                <tr
                  className="border-t border-[var(--border)]"
                  key={`${opportunity.opportunityType}-${opportunity.dimensionValue}`}
                >
                  <td className="px-4 py-3">
                    {opportunity.opportunityType.replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    {opportunity.dimensionName}: {opportunity.dimensionValue}
                  </td>
                  <td className="px-4 py-3">{opportunity.severity}</td>
                  <td className="px-4 py-3">{opportunity.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}

function PeriodChangeBlock({
  change,
  emptyLabel
}: {
  change: PeriodChange | null;
  emptyLabel: string;
}) {
  if (!change) {
    return <p className="mt-4 text-sm text-[var(--muted)]">{emptyLabel}</p>;
  }

  return (
    <dl className="mt-4 space-y-3 text-sm">
      <ForecastRow label="Client" value={change.clientName} />
      <ForecastRow label="Previous" value={formatCurrency(change.previousValue)} />
      <ForecastRow label="Current" value={formatCurrency(change.currentValue)} />
      <ForecastRow label="Change" value={formatPercent(change.changePercent)} />
    </dl>
  );
}

function ForecastRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function normalizeDimensions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, string>>(
    (dimensions, [key, dimensionValue]) => {
      dimensions[key] = String(dimensionValue ?? "");
      return dimensions;
    },
    {}
  );
}

function sumMetric(rows: PortfolioMetric[], metricName: string) {
  return rows
    .filter((row) => row.metricName === metricName)
    .reduce((total, row) => total + row.metricValue, 0);
}

function divide(numerator: number, denominator: number) {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function countElapsedDays(rows: PortfolioMetric[]) {
  return Math.max(
    1,
    new Set(rows.map((row) => row.occurredOn.toISOString().slice(0, 10))).size
  );
}

function getPortfolioPeriodDays(rows: PortfolioMetric[]) {
  const latestDate = rows[0]?.occurredOn ?? new Date();

  return new Date(
    Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth() + 1, 0)
  ).getUTCDate();
}

function countGoalPosture(clients: PortfolioClient[], rows: PortfolioMetric[]) {
  let above = 0;
  let below = 0;

  for (const client of clients) {
    const clientRows = rows.filter((row) => row.clientId === client.id);
    const evaluations = client.goals
      .map((goal) => evaluateGoal(goal, clientRows))
      .filter((value): value is boolean => value !== null);

    if (evaluations.length === 0) continue;

    if (evaluations.every(Boolean)) {
      above += 1;
    } else {
      below += 1;
    }
  }

  return { above, below };
}

function evaluateGoal(
  goal: PortfolioClient["goals"][number],
  rows: PortfolioMetric[]
) {
  const goalType = goal.goalType.toLowerCase();
  const targetValue = Number(goal.targetValue);
  const spend = sumMetric(rows, "spend");
  const revenue = sumMetric(rows, "revenue");
  const leads = sumMetric(rows, "leads");
  const conversions = sumMetric(rows, "conversions");

  if (!Number.isFinite(targetValue)) return null;
  if (goalType.includes("roas") || goalType.includes("mer")) {
    const value = divide(revenue, spend);
    return value === null ? false : value >= targetValue;
  }
  if (goalType.includes("revenue")) return revenue >= targetValue;
  if (goalType.includes("cpl") || goalType.includes("cost_per_lead")) {
    const value = divide(spend, leads);
    return value === null ? false : value <= targetValue;
  }
  if (
    goalType.includes("cpa") ||
    goalType.includes("cost_per_purchase") ||
    goalType.includes("cost_per_conversion")
  ) {
    const value = divide(spend, conversions);
    return value === null ? false : value <= targetValue;
  }

  return null;
}

function findLargestPeriodChange(
  rows: PortfolioMetric[],
  metricName: string,
  direction: "drop" | "spike"
): PeriodChange | null {
  const latestTime = Math.max(...rows.map((row) => row.occurredOn.getTime()));

  if (!Number.isFinite(latestTime)) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const currentStart = latestTime - 6 * dayMs;
  const previousStart = latestTime - 13 * dayMs;
  const previousEnd = currentStart - dayMs;
  const rowsByClient = new Map<string, PortfolioMetric[]>();

  for (const row of rows) {
    const existing = rowsByClient.get(row.clientId) ?? [];
    existing.push(row);
    rowsByClient.set(row.clientId, existing);
  }

  let largestChange: PeriodChange | null = null;

  for (const clientRows of rowsByClient.values()) {
    const previousValue = sumRowsInWindow(
      clientRows,
      metricName,
      previousStart,
      previousEnd
    );
    const currentValue = sumRowsInWindow(
      clientRows,
      metricName,
      currentStart,
      latestTime
    );

    if (previousValue === 0) continue;

    const changePercent = (currentValue - previousValue) / previousValue;
    const isCandidate =
      direction === "drop" ? changePercent < 0 : changePercent > 0;

    if (!isCandidate) continue;

    if (
      !largestChange ||
      (direction === "drop"
        ? changePercent < largestChange.changePercent
        : changePercent > largestChange.changePercent)
    ) {
      largestChange = {
        clientName: clientRows[0]?.clientName ?? "Unknown client",
        previousValue,
        currentValue,
        changePercent
      };
    }
  }

  return largestChange;
}

function sumRowsInWindow(
  rows: PortfolioMetric[],
  metricName: string,
  fromTime: number,
  toTime: number
) {
  return rows
    .filter((row) => {
      const rowTime = row.occurredOn.getTime();
      return (
        row.metricName === metricName && rowTime >= fromTime && rowTime <= toTime
      );
    })
    .reduce((total, row) => total + row.metricValue, 0);
}

function formatCurrency(value: number | null) {
  if (value === null) return "N/A";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatRatio(value: number | null) {
  if (value === null) return "N/A";
  return value.toFixed(2);
}

function formatPercent(value: number | null) {
  if (value === null) return "N/A";

  return new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits: 1
  }).format(value);
}
