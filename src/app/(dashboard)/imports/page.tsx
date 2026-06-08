import { ImportForm } from "@/components/ImportForm";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

type ImportedDataSnapshot = {
  totalRows: number;
  metricTotals: Record<string, number>;
  accountSummaries: Array<{
    clientId: string;
    clientName: string;
    platform: string;
    sourceAccountId: string;
    rows: number;
    dateFrom: Date | null;
    dateTo: Date | null;
  }>;
  recentRows: Array<{
    id: string;
    clientName: string;
    platform: string;
    sourceAccountId: string;
    metricName: string;
    metricValue: number;
    occurredOn: Date;
    campaign: string;
  }>;
};

const emptySnapshot: ImportedDataSnapshot = {
  totalRows: 0,
  metricTotals: {},
  accountSummaries: [],
  recentRows: []
};

async function getSyncRuns() {
  try {
    return await db.syncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        client: { select: { name: true } },
        accountMapping: {
          select: {
            platform: true,
            accountName: true,
            ingestionMethod: true
          }
        }
      }
    });
  } catch {
    return [];
  }
}

async function getImportedDataSnapshot(): Promise<ImportedDataSnapshot> {
  try {
    const [totalRows, metricTotals, accountGroups, recentRows, clients] =
      await Promise.all([
        db.metricRow.count(),
        db.metricRow.groupBy({
          by: ["metricName"],
          where: {
            metricName: {
              in: [
                "impressions",
                "clicks",
                "spend",
                "conversions",
                "conversion_value"
              ]
            }
          },
          _sum: {
            metricValue: true
          }
        }),
        db.metricRow.groupBy({
          by: ["clientId", "platform", "sourceAccountId"],
          _count: {
            _all: true
          },
          _min: {
            occurredOn: true
          },
          _max: {
            occurredOn: true
          },
          orderBy: {
            _count: {
              metricName: "desc"
            }
          },
          take: 20
        }),
        db.metricRow.findMany({
          orderBy: { importedAt: "desc" },
          take: 20,
          include: {
            client: {
              select: {
                name: true
              }
            }
          }
        }),
        db.client.findMany({
          select: {
            id: true,
            name: true
          }
        })
      ]);
    const clientNames = new Map(clients.map((client) => [client.id, client.name]));

    return {
      totalRows,
      metricTotals: Object.fromEntries(
        metricTotals.map((metric) => [
          metric.metricName,
          Number(metric._sum.metricValue ?? 0)
        ])
      ),
      accountSummaries: accountGroups.map((group) => ({
        clientId: group.clientId,
        clientName: clientNames.get(group.clientId) ?? "Unknown client",
        platform: group.platform,
        sourceAccountId: group.sourceAccountId,
        rows: group._count._all,
        dateFrom: group._min.occurredOn,
        dateTo: group._max.occurredOn
      })),
      recentRows: recentRows.map((row) => ({
        id: row.id,
        clientName: row.client.name,
        platform: row.platform,
        sourceAccountId: row.sourceAccountId,
        metricName: row.metricName,
        metricValue: Number(row.metricValue),
        occurredOn: row.occurredOn,
        campaign: getDimension(row.dimensions, "campaign")
      }))
    };
  } catch {
    return emptySnapshot;
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

function formatShortDate(value: Date | string | null) {
  if (!value) {
    return "No data";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatMetricValue(metricName: string, value: number) {
  if (metricName === "spend" || metricName === "conversion_value") {
    return new Intl.NumberFormat("en-IN", {
      currency: "INR",
      maximumFractionDigits: 0,
      style: "currency"
    }).format(value);
  }

  return formatNumber(value);
}

function getDimension(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const record = value as Record<string, unknown>;

  return String(record[key] ?? "");
}

export default async function ImportsPage() {
  const [syncRuns, importedData] = await Promise.all([
    getSyncRuns(),
    getImportedDataSnapshot()
  ]);
  const kpis = [
    { label: "Metric rows", value: formatNumber(importedData.totalRows) },
    {
      label: "Spend",
      value: formatMetricValue("spend", importedData.metricTotals.spend ?? 0)
    },
    {
      label: "Clicks",
      value: formatNumber(importedData.metricTotals.clicks ?? 0)
    },
    {
      label: "Conversions",
      value: formatNumber(importedData.metricTotals.conversions ?? 0)
    },
    {
      label: "Conversion value",
      value: formatMetricValue(
        "conversion_value",
        importedData.metricTotals.conversion_value ?? 0
      )
    }
  ];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
          Data Imports
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">Import runs</h1>
      </div>

      <ImportForm />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-normal">
          Database snapshot
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((item) => (
            <div
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
              key={item.label}
            >
              <p className="text-xs font-medium uppercase tracking-normal text-[var(--muted)]">
                {item.label}
              </p>
              <p className="mt-2 text-xl font-semibold tracking-normal">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-lg font-semibold tracking-normal">
            Imported account coverage
          </h2>
        </div>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--subtle)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 font-semibold">Account ID</th>
              <th className="px-4 py-3 font-semibold">Metric rows</th>
              <th className="px-4 py-3 font-semibold">From</th>
              <th className="px-4 py-3 font-semibold">To</th>
            </tr>
          </thead>
          <tbody>
            {importedData.accountSummaries.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={6}>
                  No metric rows have been stored yet.
                </td>
              </tr>
            ) : (
              importedData.accountSummaries.map((summary) => (
                <tr
                  className="border-b border-[var(--border)] last:border-b-0"
                  key={`${summary.clientId}-${summary.platform}-${summary.sourceAccountId}`}
                >
                  <td className="px-4 py-3 font-medium">
                    {summary.clientName}
                  </td>
                  <td className="px-4 py-3">{summary.platform}</td>
                  <td className="px-4 py-3">{summary.sourceAccountId}</td>
                  <td className="px-4 py-3">{formatNumber(summary.rows)}</td>
                  <td className="px-4 py-3">
                    {formatShortDate(summary.dateFrom)}
                  </td>
                  <td className="px-4 py-3">
                    {formatShortDate(summary.dateTo)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold tracking-normal">
          Script-assisted import API
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Run imports with <code className="font-mono">POST /api/imports</code>{" "}
          using a client, account mapping, date range, and connector config.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--subtle)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 font-semibold">Connector</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Rows</th>
              <th className="px-4 py-3 font-semibold">Finished</th>
            </tr>
          </thead>
          <tbody>
            {syncRuns.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={6}>
                  No import runs have been recorded yet.
                </td>
              </tr>
            ) : (
              syncRuns.map((run) => (
                <tr
                  className="border-b border-[var(--border)] last:border-b-0"
                  key={run.id}
                >
                  <td className="px-4 py-3">{run.client.name}</td>
                  <td className="px-4 py-3">{run.platform}</td>
                  <td className="px-4 py-3">{run.ingestionMethod}</td>
                  <td className="px-4 py-3">{run.status}</td>
                  <td className="px-4 py-3">{run.rowsImported}</td>
                  <td className="px-4 py-3">{formatDate(run.finishedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-lg font-semibold tracking-normal">
            Recent metric rows
          </h2>
        </div>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--subtle)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Account ID</th>
              <th className="px-4 py-3 font-semibold">Campaign</th>
              <th className="px-4 py-3 font-semibold">Metric</th>
              <th className="px-4 py-3 font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {importedData.recentRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={6}>
                  No metric rows have been stored yet.
                </td>
              </tr>
            ) : (
              importedData.recentRows.map((row) => (
                <tr
                  className="border-b border-[var(--border)] last:border-b-0"
                  key={row.id}
                >
                  <td className="px-4 py-3">
                    {formatShortDate(row.occurredOn)}
                  </td>
                  <td className="px-4 py-3 font-medium">{row.clientName}</td>
                  <td className="px-4 py-3">{row.sourceAccountId}</td>
                  <td className="px-4 py-3">{row.campaign || "No campaign"}</td>
                  <td className="px-4 py-3">{row.metricName}</td>
                  <td className="px-4 py-3">
                    {formatMetricValue(row.metricName, row.metricValue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
