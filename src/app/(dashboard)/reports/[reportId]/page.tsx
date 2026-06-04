import { db } from "@/server/db/client";
import type { ReportDraftSnapshot } from "@/server/reporting/reportBuilder";

export const dynamic = "force-dynamic";

async function getReport(reportId: string) {
  try {
    return await db.report.findUnique({
      where: { id: reportId },
      include: {
        client: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            insights: true,
            anomalies: true,
            qualityScores: true
          }
        },
        emailDrafts: true
      }
    });
  } catch {
    return null;
  }
}

function asSnapshot(value: unknown): ReportDraftSnapshot | null {
  if (value && typeof value === "object") {
    return value as ReportDraftSnapshot;
  }

  return null;
}

function formatRange(snapshot: ReportDraftSnapshot | null) {
  if (!snapshot) {
    return "No date range";
  }

  return `${snapshot.dateRange.from} to ${snapshot.dateRange.to}`;
}

export default async function ReportPreviewPage({
  params
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const report = await getReport(reportId);
  const latestVersion = report?.versions[0];
  const snapshot = asSnapshot(latestVersion?.metricsSnapshot);
  const qualityScore =
    latestVersion?.qualityScores[0]?.score ?? snapshot?.dataQuality.score ?? 0;
  const qualityRating =
    latestVersion?.qualityScores[0]?.rating ??
    snapshot?.dataQuality.rating ??
    "needs_review";
  const insights = latestVersion?.insights.length
    ? latestVersion.insights
    : snapshot?.insights ?? [];
  const anomalies = latestVersion?.anomalies.length
    ? latestVersion.anomalies
    : snapshot?.anomalies ?? [];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
          Report Preview
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          {report?.client.name ?? "Report draft"}
        </h1>
        <p className="text-sm text-[var(--muted)]">{formatRange(snapshot)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--muted)]">Selected ad source</p>
          <p className="mt-2 font-semibold">{snapshot?.adSource ?? "Unset"}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--muted)]">Revenue source</p>
          <p className="mt-2 font-semibold">
            {snapshot?.revenueSource ?? "Unset"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--muted)]">ROAS</p>
          <p className="mt-2 font-semibold">
            {snapshot?.derivedMetrics.roas?.toFixed(2) ?? "N/A"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--muted)]">Data quality score</p>
          <p className="mt-2 font-semibold">
            {qualityScore} / 100 ({qualityRating})
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold tracking-normal">KPI summary</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[var(--muted)]">Spend</dt>
              <dd className="font-semibold">{snapshot?.adTotals.spend ?? 0}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--muted)]">Revenue</dt>
              <dd className="font-semibold">{snapshot?.selectedRevenue ?? 0}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--muted)]">CTR</dt>
              <dd className="font-semibold">
                {snapshot?.derivedMetrics.ctr?.toFixed(4) ?? "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--muted)]">CPC</dt>
              <dd className="font-semibold">
                {snapshot?.derivedMetrics.cpc?.toFixed(2) ?? "N/A"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold tracking-normal">
            Platform sections
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            {(snapshot?.sourceTraceSummary ?? []).map((trace) => (
              <p key={`${trace.platform}-${trace.sourceReference}`}>
                {trace.platform}: {trace.metricCount} metrics from{" "}
                {trace.sourceReference}
              </p>
            ))}
            {!snapshot?.sourceTraceSummary.length ? (
              <p className="text-[var(--muted)]">No platform data yet.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold tracking-normal">
          Connector warnings and anomalies
        </h2>
        <div className="mt-4 space-y-2 text-sm">
          {anomalies.length === 0 ? (
            <p className="text-[var(--muted)]">No anomalies recorded.</p>
          ) : (
            anomalies.map((anomaly) => (
              <p key={`${anomaly.anomalyType}-${anomaly.message}`}>
                {anomaly.severity}: {anomaly.message}
              </p>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold tracking-normal">Budget pacing</h2>
        <pre className="mt-4 overflow-auto rounded-md bg-[#f6f8f7] p-4 text-sm">
          {JSON.stringify(snapshot?.budgetPacing ?? {}, null, 2)}
        </pre>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold tracking-normal">
          Source trace details
        </h2>
        <pre className="mt-4 overflow-auto rounded-md bg-[#f6f8f7] p-4 text-sm">
          {JSON.stringify(snapshot?.sourceTrace ?? [], null, 2)}
        </pre>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold tracking-normal">
          Editable insights
        </h2>
        <div className="mt-4 space-y-3">
          {insights.map((insight, index) => (
            <textarea
              className="min-h-24 w-full rounded-md border border-[var(--border)] p-3 text-sm"
              defaultValue={insight.text}
              key={`${insight.insightType}-${index}`}
            />
          ))}
          {insights.length === 0 ? (
            <textarea
              className="min-h-24 w-full rounded-md border border-[var(--border)] p-3 text-sm"
              defaultValue="No insights generated yet."
            />
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold tracking-normal">
          Editable client summary email
        </h2>
        <textarea
          className="mt-4 min-h-32 w-full rounded-md border border-[var(--border)] p-3 text-sm"
          defaultValue={
            report?.emailDrafts[0]?.body ??
            "Please find this reporting period's draft summary attached for review."
          }
        />
      </section>

      <div className="flex flex-wrap gap-3">
        <button className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
          Approve
        </button>
        <button className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
          Reject
        </button>
      </div>
    </section>
  );
}
