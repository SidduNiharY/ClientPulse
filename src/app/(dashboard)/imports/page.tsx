import { ImportForm } from "@/components/ImportForm";
import { db } from "@/server/db/client";
import { listDemoSyncRuns } from "@/server/demo/memoryStore";

export const dynamic = "force-dynamic";

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
    return listDemoSyncRuns();
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

export default async function ImportsPage() {
  const syncRuns = await getSyncRuns();

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
          Data Imports
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">Import runs</h1>
      </div>

      <ImportForm />

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
    </section>
  );
}
