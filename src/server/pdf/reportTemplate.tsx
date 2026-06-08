import type { ReportDraftSnapshot } from "@/server/reporting/reportBuilder";

export type ReportTemplateInput = {
  clientName: string;
  periodLabel: string;
  snapshot: ReportDraftSnapshot;
};

type InsightGroup = Record<string, string[]>;

export function renderReportHtml(input: ReportTemplateInput): string {
  const { snapshot } = input;
  const insights = groupInsights(snapshot.insights);
  const currency = snapshot.currency ?? null;
  const dailyPerformance = snapshot.dailyPerformance ?? [];
  const campaignPerformance = snapshot.campaignPerformance ?? [];
  const opportunities = snapshot.opportunities ?? [];
  const clientSafeAnomalies = snapshot.anomalies.filter(
    (anomaly) => anomaly.clientSafe
  );
  const maxDailySpend = maxValue(dailyPerformance.map((item) => item.spend));
  const maxDailyRevenue = maxValue(
    dailyPerformance.map((item) => item.selectedRevenue)
  );
  const primarySummary =
    insights.executive_summary?.[0] ??
    "Performance data is ready for review with the selected report sources.";

  const body = [
    renderCover({
      clientName: input.clientName,
      periodLabel: input.periodLabel,
      snapshot,
      currency
    }),
    section(
      "Executive Snapshot",
      `<div class="executive-grid">
        <div>
          <p class="section-kicker">${escapeHtml(
            capitalize(snapshot.reportType)
          )} performance readout</p>
          <p class="lead">${escapeHtml(primarySummary)}</p>
        </div>
        <div class="quality-panel">
          <div class="quality-score">
            <span>${snapshot.dataQuality.score}</span>
            <small>/ 100</small>
          </div>
          <p>Data confidence: ${escapeHtml(snapshot.dataQuality.rating)}</p>
          <div class="score-track">
            <div style="width:${barWidth(snapshot.dataQuality.score, 100)}"></div>
          </div>
        </div>
      </div>`
    ),
    section(
      "Core KPIs",
      `<div class="kpi-grid">
        ${metricCard("Media spend", formatMoney(snapshot.adTotals.spend, currency), "Total ad cost")}
        ${metricCard(
          getRevenueSourceLabel(snapshot.revenueSource),
          formatMoney(snapshot.selectedRevenue, currency),
          "Selected revenue"
        )}
        ${metricCard(
          "Blended ROAS",
          formatRatio(snapshot.derivedMetrics.roas),
          "Selected revenue / spend"
        )}
        ${metricCard("MER", formatRatio(snapshot.derivedMetrics.mer), "Revenue / marketing spend")}
        ${metricCard("Clicks", formatInteger(snapshot.adTotals.clicks), "Paid traffic")}
        ${metricCard(
          "Conversions",
          formatNumber(snapshot.adTotals.conversions),
          "Platform conversions"
        )}
        ${metricCard("CTR", formatRate(snapshot.derivedMetrics.ctr), "Click-through rate")}
        ${metricCard("CPC", formatMoney(snapshot.derivedMetrics.cpc, currency), "Cost per click")}
      </div>`
    ),
    section(
      "Daily Performance Trend",
      renderDailyPerformanceTable({
        rows: dailyPerformance,
        currency,
        maxDailySpend,
        maxDailyRevenue
      })
    ),
    section(
      "Top Campaign View",
      renderCampaignPerformanceTable({
        rows: campaignPerformance,
        currency
      })
    ),
    section(
      "What Changed And Why",
      `<div class="insight-columns">
        ${insightBlock("Improved", insights.what_improved)}
        ${insightBlock("Needs Attention", insights.what_declined)}
        ${insightBlock("Likely Drivers", insights.likely_reasons)}
      </div>`
    ),
    section(
      "Recommended Actions",
      renderActionList(insights.recommended_actions, opportunities)
    ),
    snapshot.budgetPacing
      ? section(
          "Budget Pacing",
          `<div class="pacing-grid">
            ${metricCard(
              "Projected month-end spend",
              formatMoney(
                snapshot.budgetPacing.projectedMonthEndSpend,
                currency
              ),
              "Run-rate forecast"
            )}
            ${metricCard(
              "Budget usage",
              formatRate(snapshot.budgetPacing.budgetUsedPercentage),
              "Spend to date"
            )}
            ${metricCard(
              "Pacing status",
              getBudgetPacingStatus(snapshot.budgetPacing),
              "Month-end outlook"
            )}
          </div>`
        )
      : section(
          "Budget Pacing",
          '<p class="muted">No active budget has been configured for this report period. Add client budgets to turn this section into a spend pacing forecast.</p>'
        ),
    section(
      "Client-Safe Watchlist",
      renderWatchlist(clientSafeAnomalies)
    ),
    section(
      "Data Confidence And Source Notes",
      `<div class="source-layout">
        ${renderQualityFactors(snapshot)}
        ${renderSourceTrace(snapshot)}
      </div>`
    )
  ].join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.clientName)} report</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2ef;
      color: #17201c;
      font-family: Aptos, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    .report {
      max-width: 980px;
      margin: 0 auto;
      padding: 0 0 24px;
    }
    .cover {
      min-height: 295px;
      border-radius: 8px;
      background: #13241f;
      color: #f8fbf8;
      padding: 34px;
      position: relative;
      overflow: hidden;
    }
    .cover:before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(8, 127, 112, 0.28), transparent 34%),
        linear-gradient(135deg, transparent 0, transparent 64%, rgba(228, 179, 99, 0.18) 64%, rgba(228, 179, 99, 0.18) 100%);
      pointer-events: none;
    }
    .cover-content { position: relative; z-index: 1; }
    .cover-top {
      display: flex;
      justify-content: space-between;
      gap: 28px;
      align-items: flex-start;
    }
    .eyebrow {
      margin: 0 0 10px;
      color: #7ed7c8;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    h1 {
      max-width: 680px;
      margin: 0;
      font-size: 36px;
      line-height: 1.04;
      letter-spacing: 0;
    }
    .period {
      margin: 14px 0 0;
      color: #d9e5e0;
      font-size: 14px;
    }
    .cover-badge {
      min-width: 158px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 8px;
      padding: 14px;
      background: rgba(255, 255, 255, 0.08);
    }
    .cover-badge span,
    .cover-badge small {
      display: block;
      color: #d9e5e0;
    }
    .cover-badge strong {
      display: block;
      margin: 5px 0;
      color: #ffffff;
      font-size: 19px;
    }
    .cover-kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 38px;
    }
    .cover-kpi {
      border-top: 3px solid #e4b363;
      background: rgba(255, 255, 255, 0.09);
      border-radius: 8px;
      padding: 13px;
    }
    .cover-kpi span {
      display: block;
      color: #c4d3ce;
      font-size: 10px;
      text-transform: uppercase;
    }
    .cover-kpi strong {
      display: block;
      margin-top: 5px;
      color: #ffffff;
      font-size: 18px;
    }
    section {
      margin-top: 14px;
      border: 1px solid #d9e2de;
      border-radius: 8px;
      background: #ffffff;
      padding: 20px;
      break-inside: avoid;
    }
    .section-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 13px;
      border-bottom: 1px solid #e8eeeb;
      padding-bottom: 10px;
    }
    h2 {
      margin: 0;
      color: #17201c;
      font-size: 18px;
      line-height: 1.2;
      letter-spacing: 0;
    }
    .section-kicker,
    .muted,
    small {
      color: #66756f;
    }
    .lead {
      margin: 0;
      color: #24302c;
      font-size: 15px;
      line-height: 1.55;
    }
    .executive-grid {
      display: grid;
      grid-template-columns: 1fr 230px;
      gap: 22px;
      align-items: stretch;
    }
    .quality-panel {
      border: 1px solid #dfe7e3;
      border-radius: 8px;
      padding: 14px;
      background: #f7faf8;
    }
    .quality-score span {
      color: #087f70;
      font-size: 36px;
      font-weight: 800;
      line-height: 1;
    }
    .score-track {
      height: 8px;
      margin-top: 10px;
      overflow: hidden;
      border-radius: 99px;
      background: #e4ece8;
    }
    .score-track div {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #087f70, #456990);
    }
    .kpi-grid,
    .pacing-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .metric {
      min-height: 86px;
      border: 1px solid #dfe7e3;
      border-radius: 8px;
      padding: 13px;
      background: #fbfdfc;
    }
    .metric span {
      display: block;
      color: #66756f;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .metric strong {
      display: block;
      margin-top: 7px;
      color: #17201c;
      font-size: 20px;
      line-height: 1.15;
    }
    .metric small {
      display: block;
      margin-top: 6px;
      font-size: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th {
      border-bottom: 1px solid #dfe7e3;
      color: #66756f;
      font-size: 10px;
      font-weight: 800;
      padding: 8px 6px;
      text-align: left;
      text-transform: uppercase;
    }
    td {
      border-bottom: 1px solid #edf2ef;
      padding: 8px 6px;
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: 0; }
    .number { text-align: right; }
    .bar-cell {
      width: 100%;
      height: 8px;
      overflow: hidden;
      border-radius: 99px;
      background: #e7efeb;
    }
    .bar-cell div {
      height: 100%;
      border-radius: inherit;
      background: #087f70;
    }
    .bar-cell.revenue div { background: #456990; }
    .campaign-name {
      overflow-wrap: anywhere;
      font-weight: 700;
    }
    .insight-columns {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .insight-block {
      border: 1px solid #dfe7e3;
      border-radius: 8px;
      padding: 14px;
      background: #fbfdfc;
    }
    .insight-block h3 {
      margin: 0 0 9px;
      color: #17201c;
      font-size: 13px;
      letter-spacing: 0;
    }
    ul {
      margin: 0;
      padding-left: 18px;
    }
    li { margin: 0 0 7px; }
    .action-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .action-item {
      border-left: 4px solid #087f70;
      border-radius: 8px;
      background: #f7faf8;
      padding: 12px 13px;
    }
    .action-item strong {
      display: block;
      margin-bottom: 5px;
    }
    .watchlist {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .watch-item {
      border: 1px solid #ead9b6;
      border-radius: 8px;
      background: #fff9ed;
      padding: 12px;
    }
    .source-layout {
      display: grid;
      grid-template-columns: 0.82fr 1.18fr;
      gap: 14px;
      align-items: start;
    }
    .factor-list {
      display: grid;
      gap: 8px;
    }
    .factor {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border: 1px solid #dfe7e3;
      border-radius: 8px;
      padding: 10px;
      background: #fbfdfc;
    }
    .status-pill {
      display: inline-block;
      min-width: 44px;
      border-radius: 99px;
      padding: 3px 8px;
      text-align: center;
      font-size: 10px;
      font-weight: 800;
    }
    .status-pill.good {
      background: #dff4ed;
      color: #066b5f;
    }
    .status-pill.bad {
      background: #fce7e4;
      color: #b42318;
    }
    footer {
      margin-top: 14px;
      color: #66756f;
      font-size: 10px;
      text-align: center;
    }
    @media print {
      body { background: #ffffff; }
      .report { padding: 0; }
    }
  </style>
</head>
<body>
  <main class="report">${body}<footer>Generated from imported metric rows. Money values follow the source account currency unless a client currency is configured.</footer></main>
</body>
</html>`;
}

function renderCover(input: {
  clientName: string;
  periodLabel: string;
  snapshot: ReportDraftSnapshot;
  currency: string | null;
}) {
  return `<section class="cover">
    <div class="cover-content">
      <div class="cover-top">
        <div>
          <p class="eyebrow">Client performance report</p>
          <h1>${escapeHtml(input.clientName)}</h1>
          <p class="period">${escapeHtml(input.periodLabel)}</p>
        </div>
        <div class="cover-badge">
          <span>${escapeHtml(capitalize(input.snapshot.reportType))}</span>
          <strong>${escapeHtml(getAdSourceLabel(input.snapshot.adSource))}</strong>
          <small>${escapeHtml(getRevenueSourceLabel(input.snapshot.revenueSource))}</small>
        </div>
      </div>
      <div class="cover-kpis">
        ${coverKpi("Spend", formatMoney(input.snapshot.adTotals.spend, input.currency))}
        ${coverKpi("Revenue", formatMoney(input.snapshot.selectedRevenue, input.currency))}
        ${coverKpi("ROAS", formatRatio(input.snapshot.derivedMetrics.roas))}
        ${coverKpi("Data quality", `${input.snapshot.dataQuality.score}/100`)}
      </div>
    </div>
  </section>`;
}

function section(title: string, body: string) {
  return `<section>
    <div class="section-header">
      <h2>${escapeHtml(title)}</h2>
    </div>
    ${body}
  </section>`;
}

function metricCard(label: string, value: string, caption: string) {
  return `<div class="metric">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
    <small>${escapeHtml(caption)}</small>
  </div>`;
}

function coverKpi(label: string, value: string) {
  return `<div class="cover-kpi">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  </div>`;
}

function renderDailyPerformanceTable(input: {
  rows: NonNullable<ReportDraftSnapshot["dailyPerformance"]>;
  currency: string | null;
  maxDailySpend: number;
  maxDailyRevenue: number;
}) {
  if (input.rows.length === 0) {
    return '<p class="muted">Daily trend data will appear when this report is regenerated with the current reporting template.</p>';
  }

  return `<table>
    <thead>
      <tr>
        <th>Date</th>
        <th class="number">Spend</th>
        <th>Spend trend</th>
        <th class="number">Selected revenue</th>
        <th>Revenue trend</th>
        <th class="number">Conversions</th>
      </tr>
    </thead>
    <tbody>
      ${input.rows
        .map(
          (row) => `<tr>
            <td>${escapeHtml(row.date)}</td>
            <td class="number">${escapeHtml(formatMoney(row.spend, input.currency))}</td>
            <td><div class="bar-cell"><div style="width:${barWidth(row.spend, input.maxDailySpend)}"></div></div></td>
            <td class="number">${escapeHtml(
              formatMoney(row.selectedRevenue, input.currency)
            )}</td>
            <td><div class="bar-cell revenue"><div style="width:${barWidth(
              row.selectedRevenue,
              input.maxDailyRevenue
            )}"></div></div></td>
            <td class="number">${escapeHtml(formatNumber(row.conversions))}</td>
          </tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

function renderCampaignPerformanceTable(input: {
  rows: NonNullable<ReportDraftSnapshot["campaignPerformance"]>;
  currency: string | null;
}) {
  if (input.rows.length === 0) {
    return '<p class="muted">Campaign rankings will appear after a new report is generated from campaign-level imports.</p>';
  }

  return `<table>
    <thead>
      <tr>
        <th>Campaign</th>
        <th class="number">Spend</th>
        <th class="number">Clicks</th>
        <th class="number">Conv.</th>
        <th class="number">Conv. value</th>
        <th class="number">CPC</th>
        <th class="number">ROAS</th>
      </tr>
    </thead>
    <tbody>
      ${input.rows
        .map(
          (row) => `<tr>
            <td class="campaign-name">${escapeHtml(row.campaign)}</td>
            <td class="number">${escapeHtml(formatMoney(row.spend, input.currency))}</td>
            <td class="number">${escapeHtml(formatInteger(row.clicks))}</td>
            <td class="number">${escapeHtml(formatNumber(row.conversions))}</td>
            <td class="number">${escapeHtml(
              formatMoney(row.conversionValue, input.currency)
            )}</td>
            <td class="number">${escapeHtml(formatMoney(row.cpc, input.currency))}</td>
            <td class="number">${escapeHtml(formatRatio(row.platformRoas))}</td>
          </tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

function insightBlock(title: string, items: string[] | undefined) {
  return `<div class="insight-block">
    <h3>${escapeHtml(title)}</h3>
    ${list(items ?? [])}
  </div>`;
}

function renderActionList(
  actionInsights: string[] | undefined,
  opportunities: NonNullable<ReportDraftSnapshot["opportunities"]>
) {
  const actions = [
    ...(actionInsights ?? []),
    ...opportunities
      .filter((item) => item.clientSafe)
      .map((item) => item.message)
  ].slice(0, 6);

  if (actions.length === 0) {
    return '<p class="muted">No recommended actions were detected. Review the KPI trend and source trace before client delivery.</p>';
  }

  return `<div class="action-list">
    ${actions
      .map(
        (action, index) => `<div class="action-item">
          <strong>Action ${index + 1}</strong>
          <span>${escapeHtml(action)}</span>
        </div>`
      )
      .join("")}
  </div>`;
}

function renderWatchlist(
  anomalies: ReportDraftSnapshot["anomalies"]
) {
  if (anomalies.length === 0) {
    return '<p class="muted">No client-safe anomalies were detected for this period.</p>';
  }

  return `<div class="watchlist">
    ${anomalies
      .map(
        (anomaly) => `<div class="watch-item">
          <strong>${escapeHtml(capitalize(anomaly.severity))}</strong>
          <p>${escapeHtml(anomaly.message)}</p>
        </div>`
      )
      .join("")}
  </div>`;
}

function renderQualityFactors(snapshot: ReportDraftSnapshot) {
  const factors = Object.entries(snapshot.dataQuality.factors);

  return `<div>
    <p class="section-kicker">Data checks</p>
    <div class="factor-list">
      ${factors
        .map(
          ([key, value]) => {
            const isOk = isQualityFactorOk(key, value);

            return `<div class="factor">
            <span>${escapeHtml(getQualityFactorLabel(key))}</span>
            <span class="status-pill ${isOk ? "good" : "bad"}">${isOk ? "OK" : "Check"}</span>
          </div>`;
          }
        )
        .join("")}
    </div>
  </div>`;
}

function renderSourceTrace(snapshot: ReportDraftSnapshot) {
  if (snapshot.sourceTraceSummary.length === 0) {
    return '<p class="muted">No source trace details were stored for this report.</p>';
  }

  return `<div>
    <p class="section-kicker">Source notes</p>
    <table>
      <thead>
        <tr>
          <th>Platform</th>
          <th>Connector</th>
          <th>Account</th>
          <th>Reference</th>
          <th class="number">Metrics</th>
        </tr>
      </thead>
      <tbody>
        ${snapshot.sourceTraceSummary
          .map(
            (trace) => `<tr>
              <td>${escapeHtml(getPlatformLabel(trace.platform))}</td>
              <td>${escapeHtml(formatToken(trace.connectorType))}</td>
              <td>${escapeHtml(trace.sourceAccountId)}</td>
              <td>${escapeHtml(trace.sourceReference)}</td>
              <td class="number">${escapeHtml(formatInteger(trace.metricCount))}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>`;
}

function groupInsights(insights: ReportDraftSnapshot["insights"]): InsightGroup {
  return insights.reduce<InsightGroup>((groups, insight) => {
    groups[insight.insightType] = groups[insight.insightType] ?? [];
    groups[insight.insightType].push(insight.text);
    return groups;
  }, {});
}

function list(items: string[]) {
  if (items.length === 0) {
    return '<p class="muted">No specific signal was detected for this section.</p>';
  }

  return `<ul>${items
    .slice(0, 4)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function getAdSourceLabel(adSource: string) {
  if (adSource === "google_ads") return "Google Ads";
  if (adSource === "meta_ads") return "Meta Ads";
  return "Google Ads + Meta Ads";
}

function getPlatformLabel(platform: string) {
  if (platform === "google_ads") return "Google Ads";
  if (platform === "meta_ads") return "Meta Ads";
  if (platform === "ga4") return "GA4";
  if (platform === "shopify") return "Shopify";
  return "Manual";
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

function getQualityFactorLabel(key: string) {
  const labels: Record<string, string> = {
    selectedSourcesSynced: "Selected sources synced",
    dataFresh: "Fresh data present",
    revenueSourceAvailable: "Revenue source available",
    hasCriticalMissingMetrics: "No critical metric gaps",
    hasExpiredToken: "No expired token flag",
    rawRowsStored: "Raw rows stored"
  };

  return labels[key] ?? formatToken(key);
}

function isQualityFactorOk(key: string, value: boolean) {
  if (key === "hasCriticalMissingMetrics" || key === "hasExpiredToken") {
    return !value;
  }

  return value;
}

function formatToken(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map(capitalize)
    .join(" ");
}

function formatMoney(value: number | null | undefined, currency: string | null) {
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

function formatInteger(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 2
  }).format(value);
}

function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${(value * 100).toFixed(2)}%`;
}

function formatRatio(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${value.toFixed(2)}x`;
}

function barWidth(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return "0%";
  }

  return `${Math.max(4, Math.min(100, (value / max) * 100)).toFixed(1)}%`;
}

function getBudgetPacingStatus(
  pacing: NonNullable<ReportDraftSnapshot["budgetPacing"]>
) {
  if (Math.abs(pacing.pacingDifference) < 1) {
    return "On track";
  }

  return pacing.pacingDifference > 0 ? "Ahead of pace" : "Behind pace";
}

function maxValue(values: number[]) {
  return values.reduce((max, value) => Math.max(max, value), 0);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
