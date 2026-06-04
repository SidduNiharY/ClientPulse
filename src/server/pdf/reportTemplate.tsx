import type { ReportDraftSnapshot } from "@/server/reporting/reportBuilder";

export type ReportTemplateInput = {
  clientName: string;
  periodLabel: string;
  snapshot: ReportDraftSnapshot;
};

export function renderReportHtml(input: ReportTemplateInput): string {
  const { snapshot } = input;
  const showGoogleAds =
    snapshot.adSource === "google_ads" ||
    snapshot.adSource === "google_ads_meta_ads";
  const showMetaAds =
    snapshot.adSource === "meta_ads" ||
    snapshot.adSource === "google_ads_meta_ads";
  const body = [
    `<section class="cover">
      <p class="eyebrow">Client performance report</p>
      <h1>${escapeHtml(input.clientName)}</h1>
      <p>${escapeHtml(input.periodLabel)}</p>
    </section>`,
    section(
      "Executive summary",
      `<p>This report uses ${escapeHtml(
        snapshot.revenueSource.replaceAll("_", " ")
      )} as the selected revenue source and includes audited source notes for every imported metric.</p>`
    ),
    section(
      "KPI grid",
      `<div class="grid">
        ${metricCard("Spend", snapshot.adTotals.spend)}
        ${metricCard("Selected revenue", snapshot.selectedRevenue)}
        ${metricCard("Blended ROAS", snapshot.derivedMetrics.roas)}
        ${metricCard("MER", snapshot.derivedMetrics.mer)}
      </div>`
    ),
    showGoogleAds
      ? section(
          "Google Ads",
          "<p>Google Ads contributed to the paid media KPI set for this report period.</p>"
        )
      : "",
    showMetaAds
      ? section(
          "Meta Ads",
          "<p>Meta Ads contributed to the paid media KPI set for this report period.</p>"
        )
      : "",
    section(
      getRevenueSourceLabel(snapshot.revenueSource),
      `<p>Revenue source value: ${formatValue(snapshot.selectedRevenue)}</p>`
    ),
    section(
      "Trend charts",
      '<div class="chart-placeholder">Trend chart data prepared</div>'
    ),
    section(
      "Top campaigns",
      "<p>Campaign ranking will use imported campaign dimensions.</p>"
    ),
    section(
      "Insights and recommendations",
      list(snapshot.insights.map((insight) => insight.text))
    ),
    section(
      "Blended ROAS/MER for ecommerce clients",
      `<p>Blended ROAS: ${formatValue(
        snapshot.derivedMetrics.roas
      )}. MER: ${formatValue(snapshot.derivedMetrics.mer)}.</p>`
    ),
    section(
      "Goal comparison",
      "<p>Goal comparisons are included when client goals are configured.</p>"
    ),
    snapshot.budgetPacing
      ? section(
          "Budget pacing",
          `<p>Projected month-end spend: ${formatValue(
            snapshot.budgetPacing.projectedMonthEndSpend
          )}</p>`
        )
      : "",
    section(
      "Client-safe anomaly highlights",
      list(
        snapshot.anomalies
          .filter((anomaly) => anomaly.clientSafe)
          .map((anomaly) => anomaly.message)
      )
    ),
    `<footer>
      <h2>Source notes</h2>
      <p>Data freshness rating: ${escapeHtml(snapshot.dataQuality.rating)}</p>
      ${list(
        snapshot.sourceTraceSummary.map(
          (trace) =>
            `${trace.platform} via ${trace.connectorType}: ${trace.sourceReference}`
        )
      )}
    </footer>`
  ].join("");

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
<body><main class="report">${body}</main></body>
</html>`;
}

function section(title: string, body: string) {
  return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function metricCard(label: string, value: number | null) {
  return `<div class="metric">
    <span>${escapeHtml(label)}</span>
    <strong>${formatValue(value)}</strong>
  </div>`;
}

function list(items: string[]) {
  if (items.length === 0) {
    return "<p>No client-safe items detected for this section.</p>";
  }

  return `<ul>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
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
  return value === null ? "N/A" : escapeHtml(String(Number(value.toFixed(2))));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
