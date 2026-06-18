import type { ReportDraftSnapshot } from "@/server/reporting/reportBuilder";

export type ReportTemplateInput = {
  clientName: string;
  periodLabel: string;
  snapshot: ReportDraftSnapshot;
};

type InsightGroup = Record<string, string[]>;
type TrendPoint = {
  label: string;
  spend: number;
  revenue: number;
  conversions: number;
};
type PlatformRow = {
  platform: "google_ads" | "meta_ads";
  spend: number;
  conversionValue: number;
  spendShare: number | null;
  platformRoas: number | null;
};
type LegacyPlatformPerformance = {
  platform: "google_ads" | "meta_ads";
  spend: number;
  conversionValue: number;
};
type ExtendedSnapshot = ReportDraftSnapshot & {
  platformPerformance?: LegacyPlatformPerformance[];
};

const colors = {
  ink: "#13241f",
  teal: "#087f70",
  tealSoft: "#dff4ed",
  blue: "#456990",
  gold: "#e4b363",
  paper: "#f6f8f7",
  line: "#d9e2de",
  muted: "#66756f",
  warning: "#b54708"
} as const;

export function renderReportHtml(input: ReportTemplateInput): string {
  const snapshot = input.snapshot as ExtendedSnapshot;
  const insights = groupInsights(snapshot.insights);
  const currency = snapshot.currency ?? null;
  const platformRows = getPlatformRows(snapshot);
  const trendPoints =
    snapshot.reportType === "monthly"
      ? aggregateMonthlyTrend(snapshot.dailyPerformance ?? [])
      : (snapshot.dailyPerformance ?? []).slice(0, 7).map((point) => ({
          label: formatShortDate(point.date),
          spend: point.spend,
          revenue: point.selectedRevenue,
          conversions: point.conversions
        }));
  const primarySummary =
    insights.executive_summary?.[0] ??
    insights.performance_summary?.[0] ??
    "Performance data is ready for review with the selected report sources.";
  const sheets =
    snapshot.reportType === "monthly"
      ? renderMonthlySheets({
          input,
          snapshot,
          insights,
          primarySummary,
          platformRows,
          trendPoints,
          currency
        })
      : renderWeeklySheet({
          input,
          snapshot,
          insights,
          primarySummary,
          platformRows,
          trendPoints,
          currency
        });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.clientName)} report</title>
  <style>${reportStyles()}</style>
</head>
<body>
  <main class="report">${sheets}</main>
</body>
</html>`;
}

function renderWeeklySheet(input: {
  input: ReportTemplateInput;
  snapshot: ExtendedSnapshot;
  insights: InsightGroup;
  primarySummary: string;
  platformRows: PlatformRow[];
  trendPoints: TrendPoint[];
  currency: string | null;
}) {
  const { snapshot, insights, platformRows, trendPoints, currency } = input;
  const agentFinding = snapshot.agentNarratives?.metricAnalysis.findings[0];
  const domainTrend = snapshot.agentNarratives?.domainTrends.items[0];
  const campaigns = (snapshot.campaignPerformance ?? []).slice(0, 3);
  const actions = getActions(snapshot, insights, 3);
  const anomalies = snapshot.anomalies
    .filter((item) => item.clientSafe)
    .slice(0, 2);

  return `<article class="sheet weekly-sheet">
    ${renderMasthead({
      clientName: input.input.clientName,
      periodLabel: input.input.periodLabel,
      snapshot,
      pageLabel: "Weekly performance brief"
    })}
    ${renderKpiStrip(snapshot, currency, 6)}
    <section class="visual-grid">
      <div class="panel trend-panel">
        ${panelTitle("Daily Performance Trend", "Spend and selected revenue")}
        ${renderBarChart(trendPoints, currency)}
      </div>
      <div class="panel split-panel">
        ${panelTitle("Google Ads vs Meta Ads Split", "Share of paid spend")}
        ${renderDonutChart(platformRows)}
        ${renderPlatformRows(platformRows, currency)}
      </div>
    </section>
    <section class="brief-grid">
      <div class="panel executive-panel">
        ${panelTitle("Executive Readout", "What the client should know")}
        <p class="summary">${escapeHtml(truncate(input.primarySummary, 330))}</p>
        ${renderComparison(snapshot)}
      </div>
      <div class="panel pulse-panel">
        ${panelTitle("Agent Analysis & Market Context", "Evidence first")}
        <div class="pulse-item">
          <span>Numbers Agent</span>
          <strong>${escapeHtml(truncate(agentFinding?.title ?? "Performance signal", 70))}</strong>
          <p>${escapeHtml(
            truncate(
              agentFinding?.detail ??
                insights.likely_reasons?.[0] ??
                "No additional numeric finding was produced.",
              190
            )
          )}</p>
        </div>
        <div class="pulse-item market">
          <span>Domain News Agent</span>
          <strong>${escapeHtml(
            truncate(
              domainTrend?.title ??
                snapshot.agentNarratives?.domainTrends.unavailableReason ??
                "No recent sourced trend available",
              90
            )
          )}</strong>
          ${domainTrend ? `<small>${escapeHtml(domainTrend.sourceName)}</small>` : ""}
        </div>
      </div>
    </section>
    <section class="bottom-grid">
      <div class="panel campaigns-panel">
        ${panelTitle("Top Campaigns", "Ranked by spend")}
        ${renderCampaignTable(campaigns, currency)}
      </div>
      <div class="panel actions-panel">
        ${panelTitle("Goals, Pacing & Recommendations", "Next best moves")}
        ${renderCompactGoalPacing(snapshot, currency)}
        ${renderActions(actions)}
        ${renderCompactAnomalies(anomalies)}
      </div>
    </section>
    ${renderSheetFooter(snapshot)}
  </article>`;
}

function renderMonthlySheets(input: {
  input: ReportTemplateInput;
  snapshot: ExtendedSnapshot;
  insights: InsightGroup;
  primarySummary: string;
  platformRows: PlatformRow[];
  trendPoints: TrendPoint[];
  currency: string | null;
}) {
  const { snapshot, insights, platformRows, trendPoints, currency } = input;
  const campaigns = (snapshot.campaignPerformance ?? []).slice(0, 5);
  const actions = getActions(snapshot, insights, 5);
  const anomalies = snapshot.anomalies
    .filter((item) => item.clientSafe)
    .slice(0, 4);

  return `<article class="sheet monthly-overview">
    ${renderMasthead({
      clientName: input.input.clientName,
      periodLabel: input.input.periodLabel,
      snapshot,
      pageLabel: "Monthly performance review · Overview"
    })}
    ${renderKpiStrip(snapshot, currency, 8)}
    <section class="visual-grid monthly-visuals">
      <div class="panel trend-panel">
        ${panelTitle("Daily Performance Trend", "Weekly roll-up of spend and selected revenue")}
        ${renderBarChart(trendPoints, currency)}
      </div>
      <div class="panel split-panel">
        ${panelTitle("Google Ads vs Meta Ads Split", "Share of paid spend")}
        ${renderDonutChart(platformRows)}
        ${renderPlatformRows(platformRows, currency)}
      </div>
    </section>
    <section class="monthly-readout">
      <div class="panel executive-panel">
        ${panelTitle("Executive Readout", "Month in one view")}
        <p class="summary large">${escapeHtml(truncate(input.primarySummary, 520))}</p>
        ${renderComparison(snapshot)}
      </div>
      <div class="panel">
        ${panelTitle("Goal & Budget Position", "Targets and pace")}
        ${renderGoalPacingList(snapshot, currency)}
      </div>
    </section>
    ${renderSheetFooter(snapshot, "Page 1 of 2")}
  </article>
  <article class="sheet monthly-detail">
    ${renderCompactHeader(input.input.clientName, input.input.periodLabel)}
    <section class="detail-top">
      <div class="panel campaigns-panel">
        ${panelTitle("Top Campaigns", "Highest-spend campaign view")}
        ${renderCampaignTable(campaigns, currency)}
        ${renderMoreNote((snapshot.campaignPerformance?.length ?? 0) - campaigns.length, "campaigns")}
      </div>
      <div class="panel">
        ${panelTitle("What Changed And Why", "Client-safe interpretation")}
        ${renderInsightColumns(insights)}
      </div>
    </section>
    <section class="panel agent-detail">
      ${panelTitle("Agent Analysis & Market Context", "Numeric findings and sourced domain trends")}
      ${renderAgentDetail(snapshot)}
    </section>
    <section class="detail-bottom">
      <div class="panel">
        ${panelTitle("Goals, Pacing & Recommendations", "Prioritized actions")}
        ${renderActions(actions)}
      </div>
      <div class="panel">
        ${panelTitle("Client-Safe Anomalies", "Items to watch")}
        ${renderCompactAnomalies(anomalies)}
        ${renderSourceNotes(snapshot)}
      </div>
    </section>
    ${renderSheetFooter(snapshot, "Page 2 of 2")}
  </article>`;
}

function renderMasthead(input: {
  clientName: string;
  periodLabel: string;
  snapshot: ReportDraftSnapshot;
  pageLabel: string;
}) {
  return `<header class="masthead">
    <div>
      <p class="eyebrow">${escapeHtml(input.pageLabel)}</p>
      <h1>${escapeHtml(truncate(input.clientName, 80))}</h1>
      <p class="period">${escapeHtml(input.periodLabel)}</p>
    </div>
    <div class="report-badge">
      <span>${escapeHtml(capitalize(input.snapshot.reportType))}</span>
      <strong>${escapeHtml(getAdSourceLabel(input.snapshot.adSource))}</strong>
      <small>${escapeHtml(getRevenueSourceLabel(input.snapshot.revenueSource))}</small>
    </div>
  </header>`;
}

function renderCompactHeader(clientName: string, periodLabel: string) {
  return `<header class="compact-header">
    <div>
      <p class="eyebrow">Monthly performance review · Detail</p>
      <h1>${escapeHtml(truncate(clientName, 80))}</h1>
    </div>
    <p>${escapeHtml(periodLabel)}</p>
  </header>`;
}

function renderKpiStrip(
  snapshot: ReportDraftSnapshot,
  currency: string | null,
  count: number
) {
  const metrics = [
    ["Media spend", formatMoney(snapshot.adTotals.spend, currency)],
    [getRevenueSourceLabel(snapshot.revenueSource), formatMoney(snapshot.selectedRevenue, currency)],
    ["Blended ROAS", formatRatio(snapshot.derivedMetrics.roas)],
    ["MER", formatRatio(snapshot.derivedMetrics.mer)],
    ["Clicks", formatInteger(snapshot.adTotals.clicks)],
    ["Conversions", formatNumber(snapshot.adTotals.conversions)],
    ["CTR", formatRate(snapshot.derivedMetrics.ctr)],
    ["CPC", formatMoney(snapshot.derivedMetrics.cpc, currency)]
  ].slice(0, count);

  return `<section class="kpi-section">
    <div class="inline-heading"><h2>KPI Summary</h2><span>${snapshot.dataQuality.score}/100 data confidence</span></div>
    <div class="kpi-strip ${count === 8 ? "eight" : ""}">
      ${metrics
        .map(
          ([label, value]) => `<div class="kpi">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>`
        )
        .join("")}
    </div>
  </section>`;
}

function renderBarChart(points: TrendPoint[], currency: string | null) {
  if (points.length === 0) {
    return '<div class="empty-chart">Trend data will appear after daily metrics are imported.</div>';
  }

  const width = 680;
  const height = 176;
  const left = 34;
  const right = 12;
  const top = 18;
  const bottom = 31;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const groupWidth = chartWidth / points.length;
  const barWidth = Math.min(18, Math.max(7, groupWidth * 0.24));
  const max = Math.max(
    1,
    ...points.flatMap((point) => [point.spend, point.revenue])
  );
  const lines = [0, 0.5, 1]
    .map((ratio) => {
      const y = top + chartHeight - chartHeight * ratio;
      return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#e3e9e6" stroke-width="1" />
        <text x="${left - 6}" y="${y + 3}" text-anchor="end" class="axis-value">${escapeHtml(
          formatCompactMoney(max * ratio, currency)
        )}</text>`;
    })
    .join("");
  const bars = points
    .map((point, index) => {
      const center = left + groupWidth * index + groupWidth / 2;
      const spendHeight = (point.spend / max) * chartHeight;
      const revenueHeight = (point.revenue / max) * chartHeight;
      return `<rect x="${center - barWidth - 2}" y="${top + chartHeight - spendHeight}" width="${barWidth}" height="${spendHeight}" rx="2" fill="${colors.teal}" />
        <rect x="${center + 2}" y="${top + chartHeight - revenueHeight}" width="${barWidth}" height="${revenueHeight}" rx="2" fill="${colors.blue}" />
        <text x="${center}" y="${height - 10}" text-anchor="middle" class="axis-label">${escapeHtml(point.label)}</text>`;
    })
    .join("");

  return `<div class="chart-wrap">
    <svg class="bar-chart" role="img" aria-label="Bar chart comparing spend and revenue over time" viewBox="0 0 ${width} ${height}">
      <title>Spend and selected revenue trend</title>
      ${lines}${bars}
    </svg>
    <div class="legend"><span class="spend">Spend</span><span class="revenue">Selected revenue</span></div>
  </div>`;
}

function renderDonutChart(rows: PlatformRow[]) {
  const google = rows.find((row) => row.platform === "google_ads");
  const total = rows.reduce((sum, row) => sum + row.spend, 0);
  const googleShare = total > 0 ? (google?.spend ?? 0) / total : 0;
  const circumference = 2 * Math.PI * 42;
  const googleDash = googleShare * circumference;
  const metaDash = circumference - googleDash;

  if (total <= 0) {
    return '<div class="empty-donut">No paid spend split available.</div>';
  }

  return `<svg class="donut-chart" role="img" aria-label="Pie chart showing Google Ads and Meta Ads spend share" viewBox="0 0 140 140">
    <title>Platform spend share</title>
    <circle cx="70" cy="70" r="42" fill="none" stroke="#e7eeeb" stroke-width="20" />
    <circle cx="70" cy="70" r="42" fill="none" stroke="${colors.teal}" stroke-width="20"
      stroke-dasharray="${googleDash} ${circumference - googleDash}" transform="rotate(-90 70 70)" />
    <circle cx="70" cy="70" r="42" fill="none" stroke="${colors.gold}" stroke-width="20"
      stroke-dasharray="${metaDash} ${circumference - metaDash}" stroke-dashoffset="${-googleDash}" transform="rotate(-90 70 70)" />
    <text x="70" y="66" text-anchor="middle" class="donut-number">${Math.round(googleShare * 100)}%</text>
    <text x="70" y="82" text-anchor="middle" class="donut-label">Google share</text>
  </svg>`;
}

function renderPlatformRows(rows: PlatformRow[], currency: string | null) {
  if (rows.length === 0) {
    return '<p class="muted">Platform metrics unavailable.</p>';
  }

  return `<div class="platform-list">${rows
    .map(
      (row) => `<div class="platform-row">
        <span class="${row.platform}">${escapeHtml(getPlatformLabel(row.platform))}</span>
        <strong>${escapeHtml(formatMoney(row.spend, currency))}</strong>
        <small>${escapeHtml(formatRatio(row.platformRoas))}</small>
      </div>`
    )
    .join("")}</div>`;
}

function renderCampaignTable(
  rows: NonNullable<ReportDraftSnapshot["campaignPerformance"]>,
  currency: string | null
) {
  if (rows.length === 0) {
    return '<p class="muted">Campaign rankings will appear after campaign-level imports.</p>';
  }

  return `<table>
    <thead><tr><th>Campaign</th><th>Spend</th><th>Conv.</th><th>ROAS</th></tr></thead>
    <tbody>${rows
      .map(
        (row) => `<tr>
          <td>${escapeHtml(truncate(row.campaign, 42))}</td>
          <td>${escapeHtml(formatMoney(row.spend, currency))}</td>
          <td>${escapeHtml(formatNumber(row.conversions))}</td>
          <td>${escapeHtml(formatRatio(row.platformRoas))}</td>
        </tr>`
      )
      .join("")}</tbody>
  </table>`;
}

function renderComparison(snapshot: ReportDraftSnapshot) {
  const comparison = snapshot.previousPeriodComparison;
  if (!comparison) {
    return '<p class="comparison-note">Previous-period comparison will appear when historical data is available.</p>';
  }

  return `<div class="comparison-strip">
    ${comparisonMetric("Spend", comparison.deltas.spend.percentChange)}
    ${comparisonMetric("Revenue", comparison.deltas.revenue.percentChange)}
    ${comparisonMetric("ROAS", comparison.deltas.roas.percentChange)}
  </div>`;
}

function comparisonMetric(label: string, change: number | null) {
  const state = change === null ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat";
  return `<div><span>${escapeHtml(label)}</span><strong class="${state}">${escapeHtml(
    formatDelta(change)
  )}</strong></div>`;
}

function renderCompactGoalPacing(
  snapshot: ReportDraftSnapshot,
  currency: string | null
) {
  const goal = snapshot.goalPerformance?.[0];
  const pacing = snapshot.budgetPacing;
  return `<div class="micro-stats">
    <div><span>Goals</span><strong>${escapeHtml(
      `${snapshot.context.goalsLoaded} ${pluralize("goal", snapshot.context.goalsLoaded)} loaded`
    )}</strong></div>
    <div><span>Primary target</span><strong>${escapeHtml(
      goal ? capitalize(goal.status) : "Not configured"
    )}</strong></div>
    <div><span>Budget pace</span><strong>${escapeHtml(
      pacing ? capitalize(pacing.status.replaceAll("_", " ")) : "Not configured"
    )}</strong></div>
    <div><span>Projection</span><strong>${escapeHtml(
      pacing ? formatMoney(pacing.projectedMonthEndSpend, currency) : "N/A"
    )}</strong></div>
  </div>`;
}

function renderGoalPacingList(
  snapshot: ReportDraftSnapshot,
  currency: string | null
) {
  const goals = (snapshot.goalPerformance ?? []).slice(0, 3);
  const pacing = snapshot.budgetPacing;
  return `<div class="goal-list">
    <div><span>Targets available</span><strong>${escapeHtml(
      `${snapshot.context.goalsLoaded} ${pluralize("goal", snapshot.context.goalsLoaded)} loaded`
    )}</strong></div>
    ${goals
      .map(
        (goal) => `<div><span>${escapeHtml(formatToken(goal.goalType))}</span><strong class="${goal.status}">${escapeHtml(
          capitalize(goal.status)
        )}</strong></div>`
      )
      .join("")}
    <div><span>Projected month-end spend</span><strong>${escapeHtml(
      pacing ? formatMoney(pacing.projectedMonthEndSpend, currency) : "Not configured"
    )}</strong></div>
    <div><span>Pacing status</span><strong>${escapeHtml(
      pacing ? capitalize(pacing.status.replaceAll("_", " ")) : "Not configured"
    )}</strong></div>
  </div>`;
}

function renderInsightColumns(insights: InsightGroup) {
  const blocks = [
    ["Improved", insights.what_improved?.[0]],
    ["Needs attention", insights.what_declined?.[0]],
    ["Likely drivers", insights.likely_reasons?.[0]]
  ];
  return `<div class="insight-list">${blocks
    .map(
      ([title, text]) => `<div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(truncate(text ?? "No specific signal was detected.", 210))}</p>
      </div>`
    )
    .join("")}</div>`;
}

function renderAgentDetail(snapshot: ReportDraftSnapshot) {
  const narratives = snapshot.agentNarratives;
  if (!narratives) {
    return '<p class="muted">Agent-assisted analysis will appear when the report is regenerated with enrichment enabled.</p>';
  }
  const findings = narratives.metricAnalysis.findings.slice(0, 3);
  const trends = narratives.domainTrends.items.slice(0, 2);

  return `<div class="agent-columns">
    <div>
      <h3>Numbers Agent</h3>
      ${findings.length
        ? findings
            .map(
              (finding) => `<div class="agent-note">
                <strong>${escapeHtml(truncate(finding.title, 80))}</strong>
                <p>${escapeHtml(truncate(finding.detail, 220))}</p>
              </div>`
            )
            .join("")
        : '<p class="muted">No additional numeric findings.</p>'}
    </div>
    <div>
      <h3>Domain News Agent</h3>
      ${trends.length
        ? trends
            .map(
              (trend) => `<div class="agent-note market">
                <strong>${escapeHtml(truncate(trend.title, 90))}</strong>
                <p>${escapeHtml(truncate(trend.summary, 210))}</p>
                <small>${escapeHtml(trend.sourceName)}</small>
              </div>`
            )
            .join("")
        : `<p class="muted">${escapeHtml(
            narratives.domainTrends.unavailableReason ??
              "No sourced domain trend was available."
          )}</p>`}
    </div>
  </div>`;
}

function getActions(
  snapshot: ReportDraftSnapshot,
  insights: InsightGroup,
  limit: number
) {
  return [
    ...(insights.recommended_actions ?? []),
    ...(snapshot.opportunities ?? [])
      .filter((item) => item.clientSafe)
      .map((item) => item.message)
  ].slice(0, limit);
}

function renderActions(actions: string[]) {
  if (actions.length === 0) {
    return '<p class="muted">No recommended action was detected for this period.</p>';
  }
  return `<ol class="action-list">${actions
    .map((action) => `<li>${escapeHtml(truncate(action, 150))}</li>`)
    .join("")}</ol>`;
}

function renderCompactAnomalies(
  anomalies: ReportDraftSnapshot["anomalies"]
) {
  if (anomalies.length === 0) {
    return '<p class="watch-note"><strong>Client-Safe Anomalies:</strong> No material anomaly detected.</p>';
  }
  return `<div class="watch-notes"><strong class="watch-heading">Client-Safe Anomalies</strong>${anomalies
    .map(
      (anomaly) => `<p><strong>${escapeHtml(capitalize(anomaly.severity))}:</strong> ${escapeHtml(
        truncate(anomaly.message, 145)
      )}</p>`
    )
    .join("")}</div>`;
}

function renderSourceNotes(snapshot: ReportDraftSnapshot) {
  const sources = snapshot.sourceTraceSummary.slice(0, 4);
  return `<div class="source-notes">
    <strong>Source Notes</strong>
    <p>${sources.length
      ? sources
          .map(
            (source) =>
              `${getPlatformLabel(source.platform)} · ${source.metricCount}`
          )
          .join("  |  ")
      : "No source trace summary stored."}</p>
    ${renderMoreNote(snapshot.sourceTraceSummary.length - sources.length, "sources")}
  </div>`;
}

function renderSheetFooter(
  snapshot: ReportDraftSnapshot,
  pageLabel = "Single-page weekly brief"
) {
  const sources = snapshot.sourceTraceSummary.slice(0, 3);
  return `<footer>
    <div><strong>Data confidence ${snapshot.dataQuality.score}/100</strong> · ${escapeHtml(
      snapshot.dataQuality.rating
    )}</div>
    <div class="footer-sources">${escapeHtml(
      sources.length
        ? `Source Notes: ${sources.map((source) => getPlatformLabel(source.platform)).join(", ")}`
        : "Source Notes: unavailable"
    )}</div>
    <div>${escapeHtml(pageLabel)}</div>
  </footer>`;
}

function panelTitle(title: string, subtitle: string) {
  return `<div class="panel-title"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(
    subtitle
  )}</p></div></div>`;
}

function renderMoreNote(count: number, noun: string) {
  return count > 0
    ? `<p class="more-note">+${count} more ${escapeHtml(noun)} available in the dashboard.</p>`
    : "";
}

function getPlatformRows(snapshot: ExtendedSnapshot): PlatformRow[] {
  if (snapshot.platformSplit?.length) {
    return snapshot.platformSplit.filter(
      (row) => row.platform === "google_ads" || row.platform === "meta_ads"
    );
  }

  const legacy = snapshot.platformPerformance ?? [];
  const totalSpend = legacy.reduce((sum, row) => sum + row.spend, 0);
  return legacy.map((row) => ({
    platform: row.platform,
    spend: row.spend,
    conversionValue: row.conversionValue,
    spendShare: totalSpend > 0 ? row.spend / totalSpend : null,
    platformRoas: row.spend > 0 ? row.conversionValue / row.spend : null
  }));
}

function aggregateMonthlyTrend(
  points: NonNullable<ReportDraftSnapshot["dailyPerformance"]>
): TrendPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const buckets: TrendPoint[] = [];

  for (let index = 0; index < sorted.length; index += 7) {
    const rows = sorted.slice(index, index + 7);
    buckets.push({
      label: `W${buckets.length + 1}`,
      spend: rows.reduce((sum, row) => sum + row.spend, 0),
      revenue: rows.reduce((sum, row) => sum + row.selectedRevenue, 0),
      conversions: rows.reduce((sum, row) => sum + row.conversions, 0)
    });
  }

  return buckets.slice(0, 5);
}

function groupInsights(insights: ReportDraftSnapshot["insights"]): InsightGroup {
  return insights.reduce<InsightGroup>((groups, insight) => {
    groups[insight.insightType] = groups[insight.insightType] ?? [];
    groups[insight.insightType].push(insight.text);
    return groups;
  }, {});
}

function reportStyles() {
  return `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      color: ${colors.ink};
      font-family: Aptos, "Segoe UI", Arial, sans-serif;
      font-size: 9px;
      line-height: 1.34;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report { margin: 0; padding: 0; }
    .sheet {
      width: 210mm;
      height: 297mm;
      padding: 10mm 11mm 8mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 3.2mm;
      background: #fff;
      break-after: page;
      page-break-after: always;
    }
    .sheet:last-child { break-after: auto; page-break-after: auto; }
    .masthead {
      min-height: 31mm;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8mm;
      border-radius: 4mm;
      padding: 6mm 7mm;
      color: #fff;
      background:
        linear-gradient(112deg, ${colors.ink} 0%, #173c34 68%, ${colors.teal} 100%);
    }
    .eyebrow {
      margin: 0 0 1.5mm;
      color: #86dfcf;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    h1 { margin: 0; font-size: 24px; line-height: 1; letter-spacing: -.02em; }
    .period { margin: 2mm 0 0; color: #d9e5e0; font-size: 10px; }
    .report-badge {
      width: 48mm;
      border: .3mm solid rgba(255,255,255,.22);
      border-radius: 3mm;
      padding: 3mm 4mm;
      background: rgba(255,255,255,.08);
    }
    .report-badge span, .report-badge small { display: block; color: #d9e5e0; }
    .report-badge span { text-transform: uppercase; font-size: 7px; font-weight: 800; }
    .report-badge strong { display: block; margin: 1mm 0; font-size: 11px; }
    .compact-header {
      min-height: 20mm;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      border-bottom: .5mm solid ${colors.ink};
      padding: 1mm 0 4mm;
    }
    .compact-header h1 { font-size: 21px; }
    .compact-header > p { margin: 0; color: ${colors.muted}; font-weight: 700; }
    .kpi-section { display: grid; gap: 2mm; }
    .inline-heading { display: flex; align-items: baseline; justify-content: space-between; }
    .inline-heading h2 { font-size: 12px; }
    .inline-heading span { color: ${colors.muted}; }
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 2mm;
    }
    .kpi-strip.eight { grid-template-columns: repeat(4, 1fr); }
    .kpi {
      min-height: 18mm;
      border-top: .8mm solid ${colors.teal};
      border-radius: 2mm;
      padding: 3mm;
      background: ${colors.paper};
    }
    .kpi:nth-child(3n) { border-top-color: ${colors.gold}; }
    .kpi span { display: block; min-height: 6mm; color: ${colors.muted}; font-size: 7px; font-weight: 800; text-transform: uppercase; }
    .kpi strong { display: block; font-size: 14px; line-height: 1.05; }
    .panel {
      border: .3mm solid ${colors.line};
      border-radius: 3mm;
      padding: 3.2mm;
      background: #fff;
      overflow: hidden;
    }
    .panel-title { min-height: 9mm; margin-bottom: 2mm; border-bottom: .25mm solid #e8eeeb; padding-bottom: 1.7mm; }
    h2, h3 { margin: 0; color: ${colors.ink}; }
    h2 { font-size: 11px; line-height: 1.1; }
    h3 { font-size: 9px; }
    .panel-title p { margin: .7mm 0 0; color: ${colors.muted}; font-size: 7px; }
    .visual-grid { min-height: 63mm; display: grid; grid-template-columns: 1.85fr .85fr; gap: 3.2mm; }
    .trend-panel, .split-panel { min-width: 0; }
    .chart-wrap { position: relative; }
    .bar-chart { display: block; width: 100%; height: 43mm; }
    .axis-label, .axis-value { fill: ${colors.muted}; font-size: 8px; font-family: Arial, sans-serif; }
    .legend { display: flex; justify-content: flex-end; gap: 4mm; margin-top: -1mm; color: ${colors.muted}; font-size: 7px; }
    .legend span:before { content: ""; display: inline-block; width: 2mm; height: 2mm; margin-right: 1mm; border-radius: 50%; vertical-align: -0.2mm; }
    .legend .spend:before { background: ${colors.teal}; }
    .legend .revenue:before { background: ${colors.blue}; }
    .donut-chart { display: block; width: 31mm; height: 31mm; margin: -1mm auto 0; }
    .donut-number { fill: ${colors.ink}; font: 800 18px Arial, sans-serif; }
    .donut-label { fill: ${colors.muted}; font: 8px Arial, sans-serif; }
    .platform-list { display: grid; gap: 1.2mm; }
    .platform-row { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 2mm; border-top: .2mm solid #edf2ef; padding-top: 1.2mm; }
    .platform-row span:before { content: ""; display: inline-block; width: 2mm; height: 2mm; margin-right: 1mm; border-radius: 50%; }
    .platform-row span.google_ads:before { background: ${colors.teal}; }
    .platform-row span.meta_ads:before { background: ${colors.gold}; }
    .platform-row small { color: ${colors.muted}; }
    .brief-grid { min-height: 48mm; display: grid; grid-template-columns: 1fr 1fr; gap: 3.2mm; }
    .summary { margin: 0; font-size: 10px; line-height: 1.45; }
    .summary.large { font-size: 11px; }
    .comparison-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; margin-top: 3mm; }
    .comparison-strip div { border-radius: 2mm; padding: 2mm; background: ${colors.paper}; }
    .comparison-strip span { display: block; color: ${colors.muted}; font-size: 7px; }
    .comparison-strip strong { font-size: 9px; }
    .comparison-strip .up { color: ${colors.teal}; }
    .comparison-strip .down { color: #b42318; }
    .comparison-note { margin: 3mm 0 0; color: ${colors.muted}; font-size: 8px; }
    .pulse-item + .pulse-item { margin-top: 2mm; border-top: .2mm solid #edf2ef; padding-top: 2mm; }
    .pulse-item span { color: ${colors.teal}; font-size: 7px; font-weight: 800; text-transform: uppercase; }
    .pulse-item strong { display: block; margin-top: .5mm; font-size: 9px; }
    .pulse-item p { margin: 1mm 0 0; color: #34433e; }
    .pulse-item.market span { color: ${colors.warning}; }
    .pulse-item small { color: ${colors.muted}; }
    .bottom-grid { min-height: 64mm; display: grid; grid-template-columns: 1.05fr .95fr; gap: 3.2mm; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { color: ${colors.muted}; font-size: 7px; text-align: right; text-transform: uppercase; }
    th:first-child, td:first-child { width: 46%; text-align: left; }
    td { border-top: .2mm solid #e8eeeb; padding: 2mm 1mm; text-align: right; }
    td:first-child { font-weight: 700; }
    .micro-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm; margin-bottom: 2mm; }
    .micro-stats div { border-radius: 1.5mm; padding: 1.5mm; background: ${colors.paper}; }
    .micro-stats span { display: block; color: ${colors.muted}; font-size: 7px; }
    .micro-stats strong { font-size: 8px; }
    .action-list { margin: 1mm 0 0; padding-left: 4.5mm; }
    .action-list li { margin-bottom: 1.5mm; padding-left: .5mm; }
    .action-list li::marker { color: ${colors.teal}; font-weight: 800; }
    .watch-note, .watch-notes p { margin: 1mm 0 0; color: #6a3b0b; font-size: 7.5px; }
    .watch-heading { display: block; margin-top: 1.5mm; color: ${colors.warning}; font-size: 7px; text-transform: uppercase; }
    footer {
      min-height: 7mm;
      margin-top: auto;
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      align-items: end;
      gap: 3mm;
      border-top: .25mm solid ${colors.line};
      padding-top: 2mm;
      color: ${colors.muted};
      font-size: 7px;
    }
    .footer-sources { text-align: center; }
    .monthly-overview .kpi-strip { row-gap: 2mm; }
    .monthly-overview .kpi { min-height: 16mm; }
    .monthly-visuals { min-height: 71mm; }
    .monthly-visuals .bar-chart { height: 50mm; }
    .monthly-readout { min-height: 66mm; display: grid; grid-template-columns: 1.2fr .8fr; gap: 3.2mm; }
    .goal-list { display: grid; }
    .goal-list > div { display: flex; justify-content: space-between; gap: 3mm; border-top: .2mm solid #edf2ef; padding: 2mm 0; }
    .goal-list > div:first-child { border-top: 0; }
    .goal-list span { color: ${colors.muted}; }
    .goal-list .met { color: ${colors.teal}; }
    .goal-list .missed { color: #b42318; }
    .detail-top { min-height: 73mm; display: grid; grid-template-columns: 1.08fr .92fr; gap: 3.2mm; }
    .insight-list { display: grid; gap: 2mm; }
    .insight-list > div { border-left: .7mm solid ${colors.teal}; padding-left: 2.5mm; }
    .insight-list p { margin: .8mm 0 0; color: #34433e; }
    .agent-detail { min-height: 77mm; }
    .agent-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
    .agent-columns > div + div { border-left: .25mm solid ${colors.line}; padding-left: 4mm; }
    .agent-note { margin-top: 2mm; border-top: .2mm solid #edf2ef; padding-top: 2mm; }
    .agent-note:first-of-type { border-top: 0; }
    .agent-note p { margin: .8mm 0 0; color: #34433e; }
    .agent-note small { color: ${colors.muted}; }
    .agent-note.market strong { color: ${colors.warning}; }
    .detail-bottom { min-height: 75mm; display: grid; grid-template-columns: 1fr 1fr; gap: 3.2mm; }
    .source-notes { margin-top: 3mm; border-top: .25mm solid ${colors.line}; padding-top: 2mm; }
    .source-notes p { margin: 1mm 0 0; }
    .more-note { margin: 1.5mm 0 0; color: ${colors.muted}; font-size: 7px; }
    .empty-chart, .empty-donut { display: grid; place-items: center; min-height: 35mm; color: ${colors.muted}; text-align: center; }
    .empty-donut { min-height: 27mm; }
    .muted { color: ${colors.muted}; }
  `;
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

function formatMoney(value: number | null | undefined, currency: string | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  const number = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2
  }).format(value);
  return currency && /^[A-Z]{3}$/.test(currency) ? `${currency} ${number}` : `$${number}`;
}

function formatCompactMoney(value: number, currency: string | null) {
  const absolute = Math.abs(value);
  const compact =
    absolute >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}m`
      : absolute >= 1_000
        ? `${(value / 1_000).toFixed(0)}k`
        : value.toFixed(0);
  return currency ? `${currency} ${compact}` : `$${compact}`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatRate(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "N/A"
    : `${(value * 100).toFixed(2)}%`;
}

function formatRatio(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "N/A"
    : `${value.toFixed(2)}x`;
}

function formatDelta(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function formatShortDate(value: string) {
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : value.slice(5);
}

function formatToken(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pluralize(noun: string, count: number) {
  return count === 1 ? noun : `${noun}s`;
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
