import Link from "next/link";
import { TrendChart } from "@/components/charts/TrendChart";
import {
  formatCount,
  formatMoney,
  formatRatio,
  resolveAppCurrency
} from "@/lib/dashboardFormat";
import {
  buildDailyTrend,
  effectiveRevenue,
  recentWindow
} from "@/lib/dashboardMetrics";
import { db } from "@/server/db/client";
import { validateProductionSetup } from "@/server/providers/validateProductionSetup";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

const importMethods = [
  "google_sheets",
  "platform_script",
  "bigquery",
  "csv_upload"
] as const;

const trendMetricNames = ["spend", "revenue", "conversion_value"];

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

async function getDashboardData() {
  const currency = resolveAppCurrency();

  try {
    const latestMetric = await db.metricRow.aggregate({
      _max: { occurredOn: true }
    });
    const latestDate = latestMetric._max.occurredOn ?? new Date();
    const window = recentWindow(latestDate, WINDOW_DAYS);

    const [
      clients,
      activeMappings,
      metricRows,
      successfulSyncs,
      failedSyncs,
      pendingReports,
      sentReports,
      windowTotals,
      dailyRows,
      latestSyncs,
      latestReports
    ] = await Promise.all([
      db.client.count(),
      db.accountMapping.count({
        where: {
          ingestionMethod: { in: [...importMethods] },
          isActive: true
        }
      }),
      db.metricRow.count(),
      db.syncRun.count({ where: { status: "succeeded" } }),
      db.syncRun.count({ where: { status: "failed" } }),
      db.report.count({ where: { status: "needs_review" } }),
      db.report.count({ where: { status: "sent" } }),
      db.metricRow.groupBy({
        by: ["metricName"],
        where: {
          occurredOn: { gte: window.from, lte: window.to },
          metricName: {
            in: ["spend", "revenue", "conversion_value", "conversions"]
          }
        },
        _sum: { metricValue: true }
      }),
      db.metricRow.groupBy({
        by: ["occurredOn", "metricName"],
        where: {
          occurredOn: { gte: window.from, lte: window.to },
          metricName: { in: trendMetricNames }
        },
        _sum: { metricValue: true },
        orderBy: { occurredOn: "asc" }
      }),
      db.syncRun.findMany({
        include: {
          accountMapping: {
            select: { accountName: true, platform: true }
          },
          client: { select: { name: true } }
        },
        orderBy: { startedAt: "desc" },
        take: 5
      }),
      db.report.findMany({
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);

    const totals = Object.fromEntries(
      windowTotals.map((metric) => [
        metric.metricName,
        Number(metric._sum.metricValue ?? 0)
      ])
    );
    const spend = totals.spend ?? 0;
    const revenue = effectiveRevenue({
      revenue: totals.revenue ?? 0,
      conversionValue: totals.conversion_value ?? 0
    });
    const trend = buildDailyTrend(
      dailyRows.map((row) => ({
        date: row.occurredOn.toISOString().slice(0, 10),
        metricName: row.metricName,
        value: Number(row._sum.metricValue ?? 0)
      }))
    );

    return {
      activeMappings,
      clients,
      currency,
      dataError: false,
      failedSyncs,
      latestReports,
      latestSyncs,
      metricRows,
      pendingReports,
      providerReadiness: validateProductionSetup(),
      revenue,
      roas: spend > 0 ? revenue / spend : null,
      sentReports,
      spend,
      successfulSyncs,
      trend,
      windowDays: WINDOW_DAYS
    };
  } catch {
    return {
      activeMappings: 0,
      clients: 0,
      currency,
      dataError: true,
      failedSyncs: 0,
      latestReports: [],
      latestSyncs: [],
      metricRows: 0,
      pendingReports: 0,
      providerReadiness: validateProductionSetup(),
      revenue: 0,
      roas: null,
      sentReports: 0,
      spend: 0,
      successfulSyncs: 0,
      trend: [],
      windowDays: WINDOW_DAYS
    };
  }
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "Not finished";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function readinessTone(status: string) {
  if (status === "ready") {
    return "text-[var(--accent)]";
  }

  if (status === "missing") {
    return "text-[var(--danger)]";
  }

  return "text-[var(--muted)]";
}

export default async function DashboardPage() {
  const data: DashboardData = await getDashboardData();
  const kpis = [
    {
      code: "CL",
      detail: "Active workspace",
      label: "Clients",
      value: formatCount(data.clients)
    },
    {
      code: "SH",
      detail: "Sheets, scripts, CSV, BigQuery",
      label: "Data sources",
      value: formatCount(data.activeMappings)
    },
    {
      code: "RW",
      detail: "Normalized metrics",
      label: "Rows stored",
      value: formatCount(data.metricRows)
    },
    {
      code: "RV",
      detail: "Needs your review",
      label: "Pending reports",
      value: formatCount(data.pendingReports)
    }
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-[var(--accent)]">
              Personal dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--foreground)]">
              Today&apos;s reporting desk
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Monitor sheet imports, review client reports, and keep provider
              readiness visible from one clean workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="primary-action" href="/imports">
              Import Google Sheet
            </Link>
            <Link className="secondary-action" href="/reports/new">
              Generate report
            </Link>
            <Link className="secondary-action" href="/approvals">
              Review queue
            </Link>
          </div>
        </div>
      </div>

      {data.dataError ? (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          Could not load metrics from the database. Showing zeros until the
          connection recovers.
        </div>
      ) : null}

      <div className="kpi-grid">
        {kpis.map((item) => (
          <div className="metric-card" key={item.label}>
            <div className="metric-code">{item.code}</div>
            <div>
              <p className="metric-label">{item.label}</p>
              <p className="metric-value">{item.value}</p>
              <p className="metric-detail">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="command-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Performance snapshot</p>
              <h2>Last {data.windowDays} days</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryStat
              label="Spend"
              value={formatMoney(data.spend, data.currency)}
            />
            <SummaryStat
              label="Revenue"
              value={formatMoney(data.revenue, data.currency)}
            />
            <SummaryStat label="ROAS" value={formatRatio(data.roas)} />
          </div>
          <div className="mt-5">
            <TrendChart
              currency={data.currency}
              height={240}
              points={data.trend}
            />
          </div>
        </section>

        <section className="command-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Provider readiness</p>
              <h2>Production checks</h2>
            </div>
          </div>
          <div className="space-y-3">
            {data.providerReadiness.map((provider) => (
              <div
                className="rounded-md border border-[var(--border)] bg-[var(--field)] p-3"
                key={provider.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{provider.label}</p>
                  <span
                    className={`text-xs font-semibold uppercase ${readinessTone(provider.status)}`}
                  >
                    {provider.status}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  {provider.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat
          label="Successful syncs"
          value={formatCount(data.successfulSyncs)}
        />
        <SummaryStat
          label="Failed syncs"
          value={formatCount(data.failedSyncs)}
        />
        <SummaryStat
          label="Reports sent"
          value={formatCount(data.sentReports)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="command-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Import activity</p>
              <h2>Latest syncs</h2>
            </div>
            <Link className="mini-action" href="/imports">
              Open
            </Link>
          </div>
          <div className="space-y-3">
            {data.latestSyncs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No sync runs yet. Start with a Google Sheet import.
              </p>
            ) : (
              data.latestSyncs.map((sync) => (
                <ActivityRow
                  detail={`${sync.accountMapping.platform} · ${sync.accountMapping.accountName}`}
                  key={sync.id}
                  label={sync.client.name}
                  meta={formatDate(sync.finishedAt ?? sync.startedAt)}
                  status={sync.status}
                />
              ))
            )}
          </div>
        </section>

        <section className="command-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Report focus</p>
              <h2>Recent reports</h2>
            </div>
            <Link className="mini-action" href="/reports/new">
              New
            </Link>
          </div>
          <div className="space-y-3">
            {data.latestReports.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No reports generated yet.
              </p>
            ) : (
              data.latestReports.map((report) => (
                <ActivityRow
                  detail={`${report.reportType} · ${report.adSource}`}
                  key={report.id}
                  label={report.client.name}
                  meta={formatDate(report.createdAt)}
                  status={report.status}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--field)] p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-semibold tracking-normal">
        {value}
      </p>
    </div>
  );
}

function ActivityRow({
  detail,
  label,
  meta,
  status
}: {
  detail: string;
  label: string;
  meta: string;
  status: string;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--field)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold">{label}</p>
        <span className="text-xs font-semibold uppercase text-[var(--muted)]">
          {status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-[var(--muted)]">{detail}</p>
      <p className="mt-2 text-xs text-[var(--muted)]">{meta}</p>
    </div>
  );
}
