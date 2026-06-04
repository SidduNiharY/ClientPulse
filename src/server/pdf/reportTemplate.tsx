import { renderToStaticMarkup } from "react-dom/server";
import type { ReportDraftSnapshot } from "@/server/reporting/reportBuilder";

export type ReportTemplateInput = {
  clientName: string;
  periodLabel: string;
  snapshot: ReportDraftSnapshot;
};

export function ReportTemplate({
  clientName,
  periodLabel,
  snapshot
}: ReportTemplateInput) {
  const showGoogleAds =
    snapshot.adSource === "google_ads" ||
    snapshot.adSource === "google_ads_meta_ads";
  const showMetaAds =
    snapshot.adSource === "meta_ads" ||
    snapshot.adSource === "google_ads_meta_ads";

  return (
    <main className="report">
      <section className="cover">
        <p className="eyebrow">Client performance report</p>
        <h1>{clientName}</h1>
        <p>{periodLabel}</p>
      </section>

      <section>
        <h2>Executive summary</h2>
        <p>
          This report uses {snapshot.revenueSource.replaceAll("_", " ")} as the
          selected revenue source and includes audited source notes for every
          imported metric.
        </p>
      </section>

      <section>
        <h2>KPI grid</h2>
        <div className="grid">
          <MetricCard label="Spend" value={snapshot.adTotals.spend} />
          <MetricCard label="Selected revenue" value={snapshot.selectedRevenue} />
          <MetricCard label="Blended ROAS" value={snapshot.derivedMetrics.roas} />
          <MetricCard label="MER" value={snapshot.derivedMetrics.mer} />
        </div>
      </section>

      {showGoogleAds ? (
        <section>
          <h2>Google Ads</h2>
          <p>
            Google Ads contributed to the paid media KPI set for this report
            period.
          </p>
        </section>
      ) : null}

      {showMetaAds ? (
        <section>
          <h2>Meta Ads</h2>
          <p>
            Meta Ads contributed to the paid media KPI set for this report
            period.
          </p>
        </section>
      ) : null}

      <section>
        <h2>{getRevenueSourceLabel(snapshot.revenueSource)}</h2>
        <p>Revenue source value: {snapshot.selectedRevenue}</p>
      </section>

      <section>
        <h2>Trend charts</h2>
        <div className="chart-placeholder">Trend chart data prepared</div>
      </section>

      <section>
        <h2>Top campaigns</h2>
        <p>Campaign ranking will use imported campaign dimensions.</p>
      </section>

      <section>
        <h2>Insights and recommendations</h2>
        <ul>
          {snapshot.insights.map((insight) => (
            <li key={`${insight.insightType}-${insight.sourceMetric}`}>
              {insight.text}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Blended ROAS/MER for ecommerce clients</h2>
        <p>
          Blended ROAS: {formatValue(snapshot.derivedMetrics.roas)}. MER:{" "}
          {formatValue(snapshot.derivedMetrics.mer)}.
        </p>
      </section>

      <section>
        <h2>Goal comparison</h2>
        <p>Goal comparisons are included when client goals are configured.</p>
      </section>

      {snapshot.budgetPacing ? (
        <section>
          <h2>Budget pacing</h2>
          <p>
            Projected month-end spend:{" "}
            {snapshot.budgetPacing.projectedMonthEndSpend}
          </p>
        </section>
      ) : null}

      <section>
        <h2>Client-safe anomaly highlights</h2>
        <ul>
          {snapshot.anomalies
            .filter((anomaly) => anomaly.clientSafe)
            .map((anomaly) => (
              <li key={`${anomaly.anomalyType}-${anomaly.message}`}>
                {anomaly.message}
              </li>
            ))}
        </ul>
      </section>

      <footer>
        <h2>Source notes</h2>
        <p>Data freshness rating: {snapshot.dataQuality.rating}</p>
        <ul>
          {snapshot.sourceTraceSummary.map((trace) => (
            <li key={`${trace.platform}-${trace.sourceReference}`}>
              {trace.platform} via {trace.connectorType}: {trace.sourceReference}
            </li>
          ))}
        </ul>
      </footer>
    </main>
  );
}

export function renderReportHtml(input: ReportTemplateInput): string {
  const body = renderToStaticMarkup(<ReportTemplate {...input} />);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.clientName)} report</title>
  <style>
    body { margin: 0; background: #f6f8f7; color: #17201c; font-family: Arial, sans-serif; }
    .report { max-width: 980px; margin: 0 auto; padding: 32px; }
    .cover { border-bottom: 2px solid #087f70; padding-bottom: 24px; }
    .eyebrow { color: #087f70; font-size: 12px; font-weight: 700; letter-spacing: 0; text-transform: uppercase; }
    h1 { font-size: 40px; margin: 0 0 8px; }
    h2 { font-size: 20px; margin: 0 0 12px; }
    section, footer { background: #fff; border: 1px solid #dfe6e2; border-radius: 8px; margin-top: 18px; padding: 20px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .metric { border: 1px solid #dfe6e2; border-radius: 6px; padding: 14px; }
    .metric span { display: block; color: #68756f; font-size: 12px; }
    .metric strong { display: block; font-size: 22px; margin-top: 6px; }
    .chart-placeholder { border: 1px dashed #087f70; border-radius: 6px; padding: 24px; color: #087f70; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function MetricCard({
  label,
  value
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>
    </div>
  );
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

function formatValue(value: number | null) {
  return value === null ? "N/A" : String(Number(value.toFixed(2)));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
