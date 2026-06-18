import type { ReportDraftSnapshot } from "./reportBuilder";

export type MetricAnalysisFinding = {
  title: string;
  detail: string;
  sourceMetric: string;
  severity: "positive" | "watch" | "neutral";
};

export type DomainTrendItem = {
  title: string;
  summary: string;
  sourceName: string;
  url?: string;
  publishedAt?: string;
};

export type ReportAgentNarratives = {
  metricAnalysis: {
    agentName: "metric_analysis_agent";
    promptVersion: string;
    generatedAt: string;
    findings: MetricAnalysisFinding[];
  };
  domainTrends: {
    agentName: "domain_trend_agent";
    promptVersion: string;
    generatedAt: string;
    query: string;
    items: DomainTrendItem[];
    unavailableReason?: string;
  };
};

export const reportAgentPrompts = {
  metricAnalysis: `You are a senior performance marketing analyst. Analyze the report snapshot numbers, period-over-period deltas, goals, budget pacing, data quality, anomalies, platform split, and campaign table. Return concise client-safe findings as JSON only: {"findings":[{"title":"...","detail":"...","sourceMetric":"...","severity":"positive|watch|neutral"}]}. Prioritize numeric evidence over generic advice. Do not invent causes that are not supported by the data.`,
  domainTrends: `You are a domain research analyst preparing a client performance PDF. Use only recent news/trend items with source names and URLs. Return JSON only: {"items":[{"title":"...","summary":"one sentence tying the trend to the client report","sourceName":"...","url":"...","publishedAt":"ISO date if known"}]}. Keep each summary client-safe, practical, and connected to marketing, ecommerce, demand generation, or the client's domain.`
} as const;

type RunReportEnrichmentAgentsInput = {
  snapshot: ReportDraftSnapshot;
  clientType?: string | null;
  now?: Date;
  fetchImpl?: typeof fetch;
};

type GdeltArticle = {
  title?: unknown;
  url?: unknown;
  domain?: unknown;
  seendate?: unknown;
};

export async function runReportEnrichmentAgents(
  input: RunReportEnrichmentAgentsInput
): Promise<ReportAgentNarratives> {
  const generatedAt = (input.now ?? new Date()).toISOString();
  const metricAnalysis = {
    agentName: "metric_analysis_agent" as const,
    promptVersion: "metric-analysis-v1",
    generatedAt,
    findings: runMetricAnalysisAgent(input.snapshot)
  };
  const domainTrends = await runDomainTrendAgent({
    snapshot: input.snapshot,
    clientType: input.clientType,
    generatedAt,
    fetchImpl: input.fetchImpl
  });

  return {
    metricAnalysis,
    domainTrends
  };
}

export function runMetricAnalysisAgent(
  snapshot: ReportDraftSnapshot
): MetricAnalysisFinding[] {
  const findings: MetricAnalysisFinding[] = [];
  const currency = snapshot.currency ?? null;
  const comparison = snapshot.previousPeriodComparison;

  findings.push({
    title: "Revenue efficiency",
    detail: `Selected revenue is ${formatMoney(
      snapshot.selectedRevenue,
      currency
    )} against ${formatMoney(snapshot.adTotals.spend, currency)} in spend, with ROAS at ${formatRatio(
      snapshot.derivedMetrics.roas
    )}.`,
    sourceMetric: "roas",
    severity:
      snapshot.derivedMetrics.roas !== null && snapshot.derivedMetrics.roas >= 3
        ? "positive"
        : "neutral"
  });

  if (comparison) {
    findings.push({
      title: "Period movement",
      detail: `Revenue moved ${formatDelta(
        comparison.deltas.revenue.percentChange
      )} while spend moved ${formatDelta(comparison.deltas.spend.percentChange)} versus the previous period.`,
      sourceMetric: "period_comparison",
      severity:
        comparison.deltas.revenue.direction === "down" ||
        (comparison.deltas.spend.direction === "up" &&
          comparison.deltas.revenue.direction !== "up")
          ? "watch"
          : "positive"
    });
  }

  const strongestPlatform = [...(snapshot.platformSplit ?? [])].sort(
    (a, b) => (b.platformRoas ?? 0) - (a.platformRoas ?? 0)
  )[0];
  if (strongestPlatform) {
    findings.push({
      title: "Platform split",
      detail: `${getPlatformLabel(strongestPlatform.platform)} has ${formatRate(
        strongestPlatform.spendShare
      )} of paid spend and ${formatRatio(strongestPlatform.platformRoas)} platform ROAS.`,
      sourceMetric: "platform_split",
      severity:
        strongestPlatform.platformRoas !== null &&
        strongestPlatform.platformRoas >= 3
          ? "positive"
          : "neutral"
    });
  }

  const topCampaign = snapshot.campaignPerformance?.[0];
  if (topCampaign) {
    findings.push({
      title: "Campaign concentration",
      detail: `${topCampaign.campaign} is the largest campaign by spend at ${formatMoney(
        topCampaign.spend,
        currency
      )}, producing ${formatRatio(topCampaign.platformRoas)} platform ROAS.`,
      sourceMetric: "campaign_performance",
      severity:
        topCampaign.platformRoas !== null && topCampaign.platformRoas < 2
          ? "watch"
          : "neutral"
    });
  }

  if (snapshot.budgetPacing) {
    findings.push({
      title: "Budget pacing",
      detail: snapshot.budgetPacing.summary,
      sourceMetric: "budget_pacing",
      severity:
        snapshot.budgetPacing.status === "behind" ? "watch" : "positive"
    });
  }

  if (snapshot.dataQuality.score < 80) {
    findings.push({
      title: "Data confidence",
      detail: `Data quality is ${snapshot.dataQuality.score}/100 (${snapshot.dataQuality.rating}); validate source freshness before sending the report.`,
      sourceMetric: "data_quality",
      severity: "watch"
    });
  }

  return findings.slice(0, 5);
}

async function runDomainTrendAgent(input: {
  snapshot: ReportDraftSnapshot;
  clientType?: string | null;
  generatedAt: string;
  fetchImpl?: typeof fetch;
}): Promise<ReportAgentNarratives["domainTrends"]> {
  const query = buildDomainTrendQuery(input.snapshot, input.clientType);
  const base = {
    agentName: "domain_trend_agent" as const,
    promptVersion: "domain-trends-v1",
    generatedAt: input.generatedAt,
    query,
    items: [] as DomainTrendItem[]
  };

  if (process.env.REPORT_DOMAIN_TRENDS_ENABLED === "false") {
    return {
      ...base,
      unavailableReason: "Domain trend lookup is disabled."
    };
  }

  const fetcher = input.fetchImpl ?? globalThis.fetch;
  if (!fetcher) {
    return {
      ...base,
      unavailableReason: "No fetch implementation is available for live trend lookup."
    };
  }

  try {
    const payload = await fetchDomainTrendPayload(query, fetcher);
    const items = sanitizeGdeltArticles(payload);

    return items.length > 0
      ? { ...base, items }
      : {
          ...base,
          unavailableReason: "No recent domain trend items were returned."
        };
  } catch {
    return {
      ...base,
      unavailableReason: "Live domain trend lookup failed."
    };
  }
}

async function fetchDomainTrendPayload(query: string, fetcher: typeof fetch) {
  const endpoint =
    process.env.REPORT_DOMAIN_TRENDS_ENDPOINT ??
    "https://api.gdeltproject.org/api/v2/doc/doc";
  const url = new URL(endpoint);
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "5");
  url.searchParams.set("sort", "hybridrel");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Trend lookup failed with ${response.status}`);
    }

    return (await response.json()) as { articles?: GdeltArticle[] };
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeGdeltArticles(payload: {
  articles?: GdeltArticle[];
}): DomainTrendItem[] {
  return (payload.articles ?? [])
    .flatMap((article) => {
      const title = sanitizeText(article.title, 140);
      const url = typeof article.url === "string" ? article.url : "";

      if (!title || !url) {
        return [];
      }

      const sourceName =
        sanitizeText(article.domain, 80) || safeHostname(url) || "News source";
      const publishedAt = sanitizeGdeltDate(article.seendate);

      return [
        {
          title,
          summary: `Recent coverage from ${sourceName} highlights ${title.toLowerCase()}, which may shape client messaging, channel mix, or offer positioning.`,
          sourceName,
          url,
          ...(publishedAt ? { publishedAt } : {})
        }
      ];
    })
    .slice(0, 3);
}

function buildDomainTrendQuery(
  snapshot: ReportDraftSnapshot,
  clientType?: string | null
) {
  const domain = sanitizeQueryTerm(clientType || snapshot.clientName);
  const revenueSource = sanitizeQueryTerm(snapshot.revenueSource);
  const adSource = sanitizeQueryTerm(snapshot.adSource);
  const baseDomain = domain || "ecommerce";

  return `${baseDomain} marketing trends ${adSource} ${revenueSource}`;
}

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function sanitizeQueryTerm(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function sanitizeGdeltDate(value: unknown) {
  if (typeof value !== "string" || value.length < 8) {
    return undefined;
  }

  const normalized = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(
    6,
    8
  )}`;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function formatMoney(value: number | null | undefined, currency: string | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2
  }).format(value);

  return currency && /^[A-Z]{3}$/.test(currency)
    ? `${currency} ${formatted}`
    : `$${formatted}`;
}

function formatRatio(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${value.toFixed(2)}x`;
}

function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function formatDelta(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function getPlatformLabel(platform: string) {
  if (platform === "google_ads") return "Google Ads";
  if (platform === "meta_ads") return "Meta Ads";
  return platform.replaceAll("_", " ");
}
