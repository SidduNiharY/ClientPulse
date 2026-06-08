import { ReportActions } from "@/components/ReportActions";
import { db } from "@/server/db/client";
import type { ReportDraftSnapshot } from "@/server/reporting/reportBuilder";

export const dynamic = "force-dynamic";

type ReportPreviewRecord = {
  client: { name: string };
  status: string;
  versions: Array<{
    metricsSnapshot: unknown;
    insights: Array<{
      insightType: string;
      text: string;
    }>;
    anomalies: Array<{
      anomalyType: string;
      severity: string;
      message: string;
    }>;
    qualityScores: Array<{
      score: number;
      rating: string;
    }>;
  }>;
  emailDrafts: Array<{ body: string }>;
};

async function getReport(reportId: string): Promise<ReportPreviewRecord | null> {
  try {
    return (await db.report.findUnique({
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
    })) as unknown as ReportPreviewRecord | null;
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
  const pdfUrl = `/api/reports/${reportId}/pdf`;

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
            Report Preview
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            {report?.client.name ?? "Report draft"}
          </h1>
          <p className="text-sm text-[var(--muted)]">{formatRange(snapshot)}</p>
        </div>
        <a
          className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--subtle)]"
          href={pdfUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open PDF
        </a>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-lg font-semibold tracking-normal">
              PDF preview
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {report?.client.name ?? "Report draft"} · {formatRange(snapshot)}
            </p>
          </div>
          <iframe
            className="h-[780px] w-full bg-white"
            src={pdfUrl}
            title="Report PDF preview"
          />
        </section>

        <div className="space-y-4">
          <ReportActions
            initialStatus={report?.status ?? snapshot?.status ?? "needs_review"}
            reportId={reportId}
          />

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-semibold tracking-normal">
              Report output
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-md border border-[var(--border)] bg-[var(--subtle)] p-3">
                <p className="text-[var(--muted)]">Data quality</p>
                <p className="mt-1 font-semibold">
                  {qualityScore} / 100 ({qualityRating})
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-md border border-[var(--border)] p-3">
                  <p className="text-[var(--muted)]">Daily points</p>
                  <p className="mt-1 font-semibold">
                    {snapshot?.dailyPerformance?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-md border border-[var(--border)] p-3">
                  <p className="text-[var(--muted)]">Campaigns ranked</p>
                  <p className="mt-1 font-semibold">
                    {snapshot?.campaignPerformance?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-md border border-[var(--border)] p-3">
                  <p className="text-[var(--muted)]">Insights</p>
                  <p className="mt-1 font-semibold">{insights.length}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--muted)]">Selected ad source</p>
          <p className="mt-2 font-semibold">
            {snapshot ? getAdSourceLabel(snapshot.adSource) : "Unset"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--muted)]">Revenue source</p>
          <p className="mt-2 font-semibold">
            {snapshot ? getRevenueSourceLabel(snapshot.revenueSource) : "Unset"}
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
              <dd className="font-semibold">
                {formatMoney(snapshot?.adTotals.spend, snapshot?.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--muted)]">Revenue</dt>
              <dd className="font-semibold">
                {formatMoney(snapshot?.selectedRevenue, snapshot?.currency)}
              </dd>
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
        <pre className="mt-4 overflow-auto rounded-md bg-[var(--code)] p-4 text-sm">
          {JSON.stringify(snapshot?.budgetPacing ?? {}, null, 2)}
        </pre>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold tracking-normal">
          Source trace details
        </h2>
        <pre className="mt-4 overflow-auto rounded-md bg-[var(--code)] p-4 text-sm">
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
    </section>
  );
}

function getAdSourceLabel(adSource: string) {
  if (adSource === "google_ads") return "Google Ads";
  if (adSource === "meta_ads") return "Meta Ads";
  return "Google Ads + Meta Ads";
}

function getRevenueSourceLabel(revenueSource: string) {
  if (revenueSource === "shopify") return "Shopify revenue";
  if (revenueSource === "ga4") return "GA4 revenue";
  if (revenueSource === "google_ads_conversion_value") {
    return "Google Ads conversion value";
  }
  if (revenueSource === "meta_purchase_value") return "Meta purchase value";
  return "Manual revenue";
}

function formatMoney(value: number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2
  }).format(value);

  if (currency && /^[A-Z]{3}$/.test(currency)) {
    return `${currency} ${formatted}`;
  }

  return `$${formatted}`;
}
