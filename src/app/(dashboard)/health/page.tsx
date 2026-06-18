import { db } from "@/server/db/client";
import { HealthActionControls } from "@/components/HealthActionControls";

export const dynamic = "force-dynamic";

type HealthRow = {
  id: string;
  accountMappingId: string;
  connectorId: string | null;
  clientName: string;
  platform: string;
  connectionType: string;
  fallbackMethod: string | null;
  lastSuccessfulSync: Date | null;
  lastFailedSync: Date | null;
  lastFailedRunId: string | null;
  lastFailedRunStartedAt: Date | null;
  lastFailedRunFinishedAt: Date | null;
  lastFailedRunError: string | null;
  healthStatus: string;
  rowsImported: number;
  latestError: string | null;
};

async function getHealthRows(): Promise<HealthRow[]> {
  try {
    const clients = await db.client.findMany({
      orderBy: { name: "asc" },
      include: {
        accountMappings: {
          include: {
            connectors: true,
            syncRuns: {
              where: { status: "failed" },
              orderBy: { startedAt: "desc" },
              take: 1,
              select: {
                id: true,
                startedAt: true,
                finishedAt: true,
                errorMessage: true
              }
            }
          }
        }
      }
    });

    return clients.flatMap((client) =>
      client.accountMappings.flatMap<HealthRow>((mapping) => {
        if (mapping.connectors.length === 0) {
          return [
            {
              id: mapping.id,
              accountMappingId: mapping.id,
              connectorId: null,
              clientName: client.name,
              platform: mapping.platform,
              connectionType: mapping.ingestionMethod,
              fallbackMethod: mapping.fallbackMethod,
              lastSuccessfulSync: null,
              lastFailedSync: null,
              lastFailedRunId: mapping.syncRuns[0]?.id ?? null,
              lastFailedRunStartedAt: mapping.syncRuns[0]?.startedAt ?? null,
              lastFailedRunFinishedAt: mapping.syncRuns[0]?.finishedAt ?? null,
              lastFailedRunError: mapping.syncRuns[0]?.errorMessage ?? null,
              healthStatus: "not_connected",
              rowsImported: 0,
              latestError: null
            }
          ];
        }

        return mapping.connectors.map((connector) => ({
          id: connector.id,
          accountMappingId: mapping.id,
          connectorId: connector.id,
          clientName: client.name,
          platform: mapping.platform,
          connectionType: connector.connectorType,
          fallbackMethod: mapping.fallbackMethod,
          lastSuccessfulSync: connector.lastSuccessfulSync,
          lastFailedSync: connector.lastFailedSync,
          lastFailedRunId: mapping.syncRuns[0]?.id ?? null,
          lastFailedRunStartedAt: mapping.syncRuns[0]?.startedAt ?? null,
          lastFailedRunFinishedAt: mapping.syncRuns[0]?.finishedAt ?? null,
          lastFailedRunError: mapping.syncRuns[0]?.errorMessage ?? null,
          healthStatus: connector.healthStatus,
          rowsImported: connector.rowsImported,
          latestError: connector.latestError
        }));
      })
    );
  } catch {
    return [];
  }
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function getFreshnessStatus(value: Date | null) {
  if (!value) {
    return "No sync";
  }

  const hoursSinceSync = (Date.now() - value.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync <= 48 ? "Fresh" : "Stale";
}

function getAccessStatus(healthStatus: string) {
  if (healthStatus === "needs_authorization") {
    return "Needs authorization";
  }

  if (healthStatus === "failed") {
    return "Check access";
  }

  return "Ready";
}

function ErrorDetails({ row }: { row: HealthRow }) {
  const primaryError = row.latestError ?? row.lastFailedRunError;

  if (!primaryError && !row.lastFailedRunId && !row.lastFailedSync) {
    return <span>No error</span>;
  }

  return (
    <details className="max-w-[360px]">
      <summary className="cursor-pointer text-sm font-medium">
        {primaryError ?? "Failure details"}
      </summary>
      <dl className="mt-2 space-y-1 text-xs text-[var(--muted)]">
        <div>
          <dt className="inline font-medium text-[var(--foreground)]">
            Connector error:{" "}
          </dt>
          <dd className="inline">{row.latestError ?? "None"}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-[var(--foreground)]">
            Last failed sync:{" "}
          </dt>
          <dd className="inline">{formatDate(row.lastFailedSync)}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-[var(--foreground)]">
            Failed run:{" "}
          </dt>
          <dd className="inline">{row.lastFailedRunId ?? "None"}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-[var(--foreground)]">
            Run started:{" "}
          </dt>
          <dd className="inline">{formatDate(row.lastFailedRunStartedAt)}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-[var(--foreground)]">
            Run finished:{" "}
          </dt>
          <dd className="inline">{formatDate(row.lastFailedRunFinishedAt)}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-[var(--foreground)]">
            Run error:{" "}
          </dt>
          <dd className="inline">{row.lastFailedRunError ?? "None"}</dd>
        </div>
      </dl>
    </details>
  );
}

export default async function HealthPage() {
  const healthRows = await getHealthRows();

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
          Connector Health
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">Health</h1>
      </div>

      <div className="overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--subtle)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Client name</th>
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 font-semibold">Connection type</th>
              <th className="px-4 py-3 font-semibold">Last successful sync</th>
              <th className="px-4 py-3 font-semibold">Last failed sync</th>
              <th className="px-4 py-3 font-semibold">Data freshness status</th>
              <th className="px-4 py-3 font-semibold">Token/access status</th>
              <th className="px-4 py-3 font-semibold">Rows imported</th>
              <th className="px-4 py-3 font-semibold">Error details</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {healthRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={10}>
                  No connector health records are available yet.
                </td>
              </tr>
            ) : (
              healthRows.map((row) => (
                <tr
                  className="border-b border-[var(--border)] last:border-b-0"
                  key={row.id}
                >
                  <td className="px-4 py-3">{row.clientName}</td>
                  <td className="px-4 py-3">{row.platform}</td>
                  <td className="px-4 py-3">{row.connectionType}</td>
                  <td className="px-4 py-3">
                    {formatDate(row.lastSuccessfulSync)}
                  </td>
                  <td className="px-4 py-3">{formatDate(row.lastFailedSync)}</td>
                  <td className="px-4 py-3">
                    {getFreshnessStatus(row.lastSuccessfulSync)}
                  </td>
                  <td className="px-4 py-3">
                    {getAccessStatus(row.healthStatus)}
                  </td>
                  <td className="px-4 py-3">{row.rowsImported}</td>
                  <td className="px-4 py-3">
                    <ErrorDetails row={row} />
                  </td>
                  <td className="px-4 py-3">
                    <HealthActionControls
                      accountMappingId={row.accountMappingId}
                      canSwitchFallback={Boolean(row.fallbackMethod)}
                      connectorId={row.connectorId}
                    />
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
