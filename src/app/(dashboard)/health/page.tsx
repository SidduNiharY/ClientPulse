import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

type HealthRow = {
  id: string;
  clientName: string;
  platform: string;
  connectionType: string;
  lastSuccessfulSync: Date | null;
  lastFailedSync: Date | null;
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
            connectors: true
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
              clientName: client.name,
              platform: mapping.platform,
              connectionType: mapping.ingestionMethod,
              lastSuccessfulSync: null,
              lastFailedSync: null,
              healthStatus: "not_connected",
              rowsImported: 0,
              latestError: null
            }
          ];
        }

        return mapping.connectors.map((connector) => ({
          id: connector.id,
          clientName: client.name,
          platform: mapping.platform,
          connectionType: connector.connectorType,
          lastSuccessfulSync: connector.lastSuccessfulSync,
          lastFailedSync: connector.lastFailedSync,
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
          <thead className="border-b border-[var(--border)] bg-[#eef4f1] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Client name</th>
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 font-semibold">Connection type</th>
              <th className="px-4 py-3 font-semibold">Last successful sync</th>
              <th className="px-4 py-3 font-semibold">Last failed sync</th>
              <th className="px-4 py-3 font-semibold">Data freshness status</th>
              <th className="px-4 py-3 font-semibold">Token/access status</th>
              <th className="px-4 py-3 font-semibold">Rows imported</th>
              <th className="px-4 py-3 font-semibold">Latest error message</th>
              <th className="px-4 py-3 font-semibold">Retry action</th>
              <th className="px-4 py-3 font-semibold">Switch fallback action</th>
            </tr>
          </thead>
          <tbody>
            {healthRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={11}>
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
                    {row.latestError ?? "No error"}
                  </td>
                  <td className="px-4 py-3">
                    <button className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium">
                      Retry
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium">
                      Switch fallback
                    </button>
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
