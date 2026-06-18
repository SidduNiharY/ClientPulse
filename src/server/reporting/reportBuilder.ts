import { Prisma } from "@prisma/client";
import type {
  DateRange,
  MetricName,
  NormalizedMetricRow,
  Platform,
  SourceTrace
} from "@/server/connectors/types";
import { db } from "@/server/db/client";
import { detectAnomalies, type AnomalyResult } from "./anomalies";
import { calculateBudgetPacing } from "./budgetPacing";
import { scoreDataQuality } from "./dataQuality";
import { generateInsights, generateRuleBasedInsights } from "./insights";
import {
  runReportEnrichmentAgents,
  type ReportAgentNarratives
} from "./reportAgents";
import {
  calculateDerivedMetrics,
  resolveSelectedRevenue,
  type DerivedMetrics,
  type MetricTotals,
  type RevenueSource
} from "./metrics";
import { detectOpportunities, type OpportunityResult } from "./opportunities";
import {
  buildSourceTraceSummary,
  collectSourceTraceDetails,
  countSourceTraceDetails,
  type SourceTraceSummary
} from "./sourceTrace";
import {
  preflightReportSourceHealth,
  type SourceFreshnessContext,
  type SourceHealthWarning
} from "./sourceHealth";

export type ReportType = "weekly" | "monthly";
export type AdSourceSelection =
  | "google_ads"
  | "meta_ads"
  | "google_ads_meta_ads";
export type RevenueSourceSelection = RevenueSource;

export type ReportBuildRequest = {
  clientId: string;
  reportType: ReportType;
  dateRange: DateRange;
  adSource: AdSourceSelection;
  revenueSource: RevenueSourceSelection;
  generatedByUserId: string;
};

export type ReportInsightDraft = {
  insightType: string;
  text: string;
  sourceMetric: string;
};

export type ReportDraftMetricRow = NormalizedMetricRow;

type BudgetForPacing = {
  monthlyBudget: number;
};

type GoalForInsights = {
  goalType: string;
  targetValue: number;
};

export type MetricDelta = {
  absoluteChange: number;
  percentChange: number | null;
  direction: "up" | "down" | "flat";
};

export type PreviousPeriodComparison = {
  dateRange: DateRange;
  adTotals: MetricTotals;
  selectedRevenue: number;
  derivedMetrics: DerivedMetrics;
  deltas: {
    spend: MetricDelta;
    revenue: MetricDelta;
    conversions: MetricDelta;
    roas: MetricDelta;
  };
};

export type BlendedMetrics = {
  roas: number | null;
  mer: number | null;
  totalMarketingSpend: number;
  selectedRevenue: number;
};

export type PlatformSplit = {
  platform: "google_ads" | "meta_ads";
  spend: number;
  conversionValue: number;
  spendShare: number | null;
  platformRoas: number | null;
};

export type GoalPerformance = {
  goalType: string;
  targetValue: number;
  actualValue: number | null;
  status: "met" | "missed" | "unknown";
  summary: string;
};

export type ConnectorHealthWarning = SourceHealthWarning;

export type ReportDailyPerformance = MetricTotals & {
  date: string;
  selectedRevenue: number;
};

export type ReportCampaignPerformance = MetricTotals & {
  campaign: string;
  ctr: number | null;
  cpc: number | null;
  costPerConversion: number | null;
  conversionRate: number | null;
  platformRoas: number | null;
};

export type ReportDraftSnapshot = {
  status: "needs_review";
  clientId: string;
  clientName: string;
  reportType: ReportType;
  dateRange: DateRange;
  adSource: AdSourceSelection;
  revenueSource: RevenueSourceSelection;
  currency?: string | null;
  adTotals: MetricTotals;
  selectedRevenue: number;
  totalMarketingSpend: number;
  derivedMetrics: DerivedMetrics;
  blendedMetrics?: BlendedMetrics;
  platformSplit?: PlatformSplit[];
  previousPeriodComparison?: PreviousPeriodComparison;
  dailyPerformance?: ReportDailyPerformance[];
  campaignPerformance?: ReportCampaignPerformance[];
  opportunities?: OpportunityResult[];
  sourceTrace: SourceTrace[];
  sourceTraceSummary: SourceTraceSummary[];
  sourceTraceTotalCount?: number;
  sourceTraceTruncated?: boolean;
  metricRowsLoaded?: number;
  dataQuality: ReturnType<typeof scoreDataQuality>;
  anomalies: AnomalyResult[];
  budgetPacing: ReturnType<typeof calculateBudgetPacing> | null;
  goalPerformance?: GoalPerformance[];
  connectorHealthWarnings?: ConnectorHealthWarning[];
  freshness?: SourceFreshnessContext;
  insights: ReportInsightDraft[];
  agentNarratives?: ReportAgentNarratives;
  context: {
    accountMappingsLoaded: number;
    goalsLoaded: number;
    budgetsLoaded: number;
  };
};

const reportMetricNames = [
  "impressions",
  "clicks",
  "spend",
  "conversions",
  "conversion_value",
  "revenue",
  "orders",
  "leads",
  "sessions",
  "active_users",
  "transactions",
  "reach",
  "frequency"
] satisfies MetricName[];

const sourceTraceDetailLimit = 250;

export function buildReportDraftSnapshot(input: {
  request: ReportBuildRequest;
  clientName: string;
  metricRows: ReportDraftMetricRow[];
  previousMetricRows?: ReportDraftMetricRow[];
  generatedAt?: string;
  accountMappingsLoaded?: number;
  goalsLoaded?: number;
  goals?: GoalForInsights[];
  budgets?: BudgetForPacing[];
}): ReportDraftSnapshot {
  const adRows = input.metricRows.filter((row) =>
    getAdPlatforms(input.request.adSource).includes(row.platform)
  );
  const adTotals = sumMetricTotals(adRows);
  const revenuePlatform = getRevenuePlatform(input.request.revenueSource);
  const revenueMetricName = getRevenueMetricName(input.request.revenueSource);
  const shopifyRevenue = sumMetric(input.metricRows, "shopify", "revenue");
  const ga4Revenue = sumMetric(input.metricRows, "ga4", "revenue");
  const googleAdsConversionValue = sumMetric(
    input.metricRows,
    "google_ads",
    "conversion_value"
  );
  const metaPurchaseValue = sumMetric(
    input.metricRows,
    "meta_ads",
    "conversion_value"
  );
  const manualRevenue = sumMetric(input.metricRows, "manual", "revenue");
  const selectedRevenue = resolveSelectedRevenue({
    revenueSource: input.request.revenueSource,
    shopifyRevenue,
    ga4Revenue,
    googleAdsConversionValue,
    metaPurchaseValue,
    manualRevenue
  });
  const totalMarketingSpend = sumMetric(input.metricRows, "google_ads", "spend")
    + sumMetric(input.metricRows, "meta_ads", "spend");
  const derivedMetrics = calculateDerivedMetrics({
    adTotals,
    selectedRevenue,
    totalMarketingSpend
  });
  const blendedMetrics = {
    roas: divide(selectedRevenue, totalMarketingSpend),
    mer: divide(selectedRevenue, totalMarketingSpend),
    totalMarketingSpend,
    selectedRevenue
  };
  const platformSplit = buildPlatformSplit(input.metricRows, totalMarketingSpend);
  const previousPeriodComparison = input.previousMetricRows?.length
    ? buildPreviousPeriodComparison({
        request: input.request,
        rows: input.previousMetricRows,
        current: {
          adTotals,
          selectedRevenue,
          derivedMetrics
        }
      })
    : undefined;
  const dailyPerformance = buildDailyPerformance({
    rows: input.metricRows,
    adPlatforms: getAdPlatforms(input.request.adSource),
    revenuePlatform,
    revenueMetricName
  });
  const campaignPerformance = buildCampaignPerformance(adRows);
  const opportunities = detectOpportunities({ rows: adRows }).slice(0, 8);
  const sourceTrace = collectSourceTraceDetails(
    input.metricRows,
    sourceTraceDetailLimit
  );
  const sourceTraceTotalCount = countSourceTraceDetails(input.metricRows);
  const missingPlatforms = findMissingPlatforms(input.request, input.metricRows);
  const sourceHealth = preflightReportSourceHealth({
    rows: input.metricRows,
    expectedPlatforms: getExpectedPlatforms(input.request),
    checkedAt: input.generatedAt ?? `${input.request.dateRange.to}T23:59:59.000Z`
  });
  const dataQuality = scoreDataQuality({
    selectedSourcesSynced: missingPlatforms.length === 0,
    dataFresh:
      input.metricRows.length > 0 &&
      sourceHealth.freshness.stalePlatforms.length === 0,
    revenueSourceAvailable: selectedRevenue > 0,
    hasCriticalMissingMetrics: adTotals.impressions === 0,
    hasExpiredToken: false,
    rawRowsStored: input.metricRows.length > 0
  });
  const anomalies = detectAnomalies({
    current: {
      spend: adTotals.spend,
      revenue: selectedRevenue,
      conversions: adTotals.conversions,
      impressions: adTotals.impressions,
      cpc: derivedMetrics.cpc,
      cpl: derivedMetrics.cpl,
      roas: derivedMetrics.roas
    },
    previous: previousPeriodComparison
      ? {
          spend: previousPeriodComparison.adTotals.spend,
          revenue: previousPeriodComparison.selectedRevenue,
          conversions: previousPeriodComparison.adTotals.conversions,
          impressions: previousPeriodComparison.adTotals.impressions,
          cpc: previousPeriodComparison.derivedMetrics.cpc,
          cpl: previousPeriodComparison.derivedMetrics.cpl,
          roas: previousPeriodComparison.derivedMetrics.roas
        }
      : {
          spend: 0,
          revenue: 0,
          conversions: 0,
          impressions: 0,
          cpc: null,
          cpl: null,
          roas: null
        },
    missingPlatforms
  });
  const budget = input.budgets?.[0];
  const budgetPacing = budget
    ? calculateBudgetPacing({
        monthlyBudget: budget.monthlyBudget,
        spendToDate: adTotals.spend,
        dayOfMonth: new Date(input.request.dateRange.to).getUTCDate(),
        daysInMonth: getDaysInMonth(input.request.dateRange.to)
      })
    : null;
  const insights = generateRuleBasedInsights({
    metrics: {
      spend: adTotals.spend,
      revenue: selectedRevenue,
      roas: derivedMetrics.roas,
      ctr: derivedMetrics.ctr,
      conversionRate: derivedMetrics.conversionRate,
      cpl: derivedMetrics.cpl,
      currentSpend: adTotals.spend,
      previousSpend: previousPeriodComparison?.adTotals.spend ?? 0,
      currentRevenue: selectedRevenue,
      previousRevenue: previousPeriodComparison?.selectedRevenue ?? 0,
      currentRoas: derivedMetrics.roas,
      previousRoas: previousPeriodComparison?.derivedMetrics.roas ?? null,
      currentCtr: derivedMetrics.ctr,
      previousCtr: previousPeriodComparison?.derivedMetrics.ctr ?? null,
      currentConversionRate: derivedMetrics.conversionRate,
      previousConversionRate:
        previousPeriodComparison?.derivedMetrics.conversionRate ?? null,
      shopifyRevenue,
      platformConversionValue: googleAdsConversionValue + metaPurchaseValue
    },
    goals: buildGoalMap(input.goals ?? []),
    anomalies: anomalies.map((anomaly) => ({
      anomalyType: anomaly.anomalyType,
      message: anomaly.message,
      clientSafe: anomaly.clientSafe
    })),
    freshness: sourceHealth.freshness
  });
  const goalPerformance = buildGoalPerformance({
    goals: input.goals ?? [],
    derivedMetrics,
    blendedMetrics,
    adTotals,
    selectedRevenue
  });
  const connectorHealthWarnings = sourceHealth.warnings;

  return {
    status: "needs_review",
    clientId: input.request.clientId,
    clientName: input.clientName,
    reportType: input.request.reportType,
    dateRange: input.request.dateRange,
    adSource: input.request.adSource,
    revenueSource: input.request.revenueSource,
    currency: findPrimaryCurrency(input.metricRows),
    adTotals,
    selectedRevenue,
    totalMarketingSpend,
    derivedMetrics,
    blendedMetrics,
    platformSplit,
    previousPeriodComparison,
    dailyPerformance,
    campaignPerformance,
    opportunities,
    sourceTrace,
    sourceTraceSummary: buildSourceTraceSummary(input.metricRows),
    sourceTraceTotalCount,
    sourceTraceTruncated: sourceTraceTotalCount > sourceTrace.length,
    metricRowsLoaded: input.metricRows.length,
    dataQuality,
    anomalies,
    budgetPacing,
    goalPerformance,
    connectorHealthWarnings,
    freshness: sourceHealth.freshness,
    insights,
    context: {
      accountMappingsLoaded: input.accountMappingsLoaded ?? 0,
      goalsLoaded: input.goalsLoaded ?? 0,
      budgetsLoaded: input.budgets?.length ?? 0
    }
  };
}

export async function buildReportDraft(request: ReportBuildRequest) {
  const client = await db.client.findUniqueOrThrow({
    where: { id: request.clientId },
    include: {
      accountMappings: true,
      goals: true,
      budgets: true
    }
  });
  const previousDateRange = getPreviousDateRange(request.dateRange);
  const metricRows = await db.metricRow.findMany({
    where: {
      clientId: request.clientId,
      platform: {
        in: getReportPlatforms(request)
      },
      metricName: {
        in: reportMetricNames
      },
      occurredOn: {
        gte: new Date(request.dateRange.from),
        lte: new Date(request.dateRange.to)
      },
      syncRun: {
        status: "succeeded"
      }
    },
    select: {
      clientId: true,
      platform: true,
      ingestionMethod: true,
      sourceAccountId: true,
      metricName: true,
      metricValue: true,
      currency: true,
      occurredOn: true,
      dimensions: true,
      originalFieldName: true,
      sourceReference: true,
      syncRunId: true,
      importedAt: true
    }
  });
  const previousMetricRows = await db.metricRow.findMany({
    where: {
      clientId: request.clientId,
      platform: {
        in: getReportPlatforms(request)
      },
      metricName: {
        in: reportMetricNames
      },
      occurredOn: {
        gte: new Date(previousDateRange.from),
        lte: new Date(previousDateRange.to)
      },
      syncRun: {
        status: "succeeded"
      }
    },
    select: {
      clientId: true,
      platform: true,
      ingestionMethod: true,
      sourceAccountId: true,
      metricName: true,
      metricValue: true,
      currency: true,
      occurredOn: true,
      dimensions: true,
      originalFieldName: true,
      sourceReference: true,
      syncRunId: true,
      importedAt: true
    }
  });
  const draft = buildReportDraftSnapshot({
    request,
    clientName: client.name,
    metricRows: metricRows.map(serializeMetricRowForDraft),
    previousMetricRows: previousMetricRows.map(serializeMetricRowForDraft),
    generatedAt: new Date().toISOString(),
    accountMappingsLoaded: client.accountMappings.length,
    goalsLoaded: client.goals.length,
    goals: client.goals.map((goal) => ({
      goalType: goal.goalType,
      targetValue: Number(goal.targetValue)
    })),
    budgets: client.budgets.map((budget) => ({
      monthlyBudget: Number(budget.monthlyBudget)
    }))
  });
  draft.insights = await generateInsights({
    provider:
      process.env.AI_PROVIDER && process.env.AI_API_KEY
        ? "external_ai"
        : "rule_based",
    metrics: {
      spend: draft.adTotals.spend,
      revenue: draft.selectedRevenue,
      roas: draft.derivedMetrics.roas,
      ctr: draft.derivedMetrics.ctr,
      conversionRate: draft.derivedMetrics.conversionRate,
      cpl: draft.derivedMetrics.cpl,
      currentSpend: draft.adTotals.spend,
      previousSpend:
        draft.previousPeriodComparison?.adTotals.spend ?? 0,
      currentRevenue: draft.selectedRevenue,
      previousRevenue:
        draft.previousPeriodComparison?.selectedRevenue ?? 0,
      currentRoas: draft.derivedMetrics.roas,
      previousRoas:
        draft.previousPeriodComparison?.derivedMetrics.roas ?? null,
      currentCtr: draft.derivedMetrics.ctr,
      previousCtr:
        draft.previousPeriodComparison?.derivedMetrics.ctr ?? null,
      currentConversionRate: draft.derivedMetrics.conversionRate,
      previousConversionRate:
        draft.previousPeriodComparison?.derivedMetrics.conversionRate ?? null,
      platformConversionValue: draft.adTotals.conversionValue
    },
    goals: buildGoalMap(
      client.goals.map((goal) => ({
        goalType: goal.goalType,
        targetValue: Number(goal.targetValue)
      }))
    ),
    anomalies: draft.anomalies.map((anomaly) => ({
      anomalyType: anomaly.anomalyType,
      clientSafe: anomaly.clientSafe,
      message: anomaly.message
    })),
    freshness: draft.freshness
  });
  draft.agentNarratives = await runReportEnrichmentAgents({
    snapshot: draft,
    clientType: client.clientType
  });
  const report = await db.report.create({
    data: {
      clientId: request.clientId,
      reportType: request.reportType,
      dateFrom: new Date(request.dateRange.from),
      dateTo: new Date(request.dateRange.to),
      adSource: request.adSource,
      revenueSource: request.revenueSource,
      status: "needs_review",
      generatedByUserId: request.generatedByUserId
    }
  });
  const version = await db.reportVersion.create({
    data: {
      reportId: report.id,
      versionNumber: 1,
      metricsSnapshot: draft as unknown as Prisma.InputJsonObject,
      sourceTrace: draft.sourceTrace as unknown as Prisma.InputJsonArray,
      insights: {
        create: draft.insights
      },
      anomalies: {
        create: draft.anomalies
      },
      qualityScores: {
        create: {
          score: draft.dataQuality.score,
          rating: draft.dataQuality.rating,
          factors: draft.dataQuality.factors
        }
      }
    }
  });

  return {
    reportId: report.id,
    versionId: version.id,
    status: draft.status,
    draft
  };
}

function sumMetricTotals(rows: ReportDraftMetricRow[]): MetricTotals {
  return {
    impressions: sumMetricName(rows, "impressions"),
    clicks: sumMetricName(rows, "clicks"),
    spend: sumMetricName(rows, "spend"),
    conversions: sumMetricName(rows, "conversions"),
    conversionValue: sumMetricName(rows, "conversion_value"),
    revenue: sumMetricName(rows, "revenue"),
    orders: sumMetricName(rows, "orders"),
    leads: sumMetricName(rows, "leads")
  };
}

function serializeMetricRowForDraft(row: {
  clientId: string;
  platform: Platform;
  ingestionMethod: NormalizedMetricRow["ingestionMethod"];
  sourceAccountId: string;
  metricName: string;
  metricValue: unknown;
  currency: string | null;
  occurredOn: Date;
  dimensions: unknown;
  originalFieldName: string;
  sourceReference: string;
  syncRunId: string;
  importedAt: Date;
}): ReportDraftMetricRow {
  const occurredOn = row.occurredOn.toISOString().slice(0, 10);

  return {
    clientId: row.clientId,
    platform: row.platform,
    ingestionMethod: row.ingestionMethod,
    sourceAccountId: row.sourceAccountId,
    metricName: row.metricName as NormalizedMetricRow["metricName"],
    metricValue: Number(row.metricValue),
    currency: row.currency,
    occurredOn,
    dimensions: row.dimensions as Record<string, string>,
    sourceTrace: {
      platform: row.platform,
      connectorType: row.ingestionMethod,
      sourceAccountId: row.sourceAccountId,
      originalFieldName: row.originalFieldName,
      sourceReference: row.sourceReference,
      syncRunId: row.syncRunId,
      dateRange: {
        from: occurredOn,
        to: occurredOn
      },
      importedAt: row.importedAt.toISOString()
    }
  };
}

function emptyMetricTotals(): MetricTotals {
  return {
    impressions: 0,
    clicks: 0,
    spend: 0,
    conversions: 0,
    conversionValue: 0,
    revenue: 0,
    orders: 0,
    leads: 0
  };
}

function buildDailyPerformance(input: {
  rows: ReportDraftMetricRow[];
  adPlatforms: Platform[];
  revenuePlatform: Platform;
  revenueMetricName: MetricName;
}): ReportDailyPerformance[] {
  const byDate = new Map<string, ReportDailyPerformance>();

  for (const row of input.rows) {
    const date = row.occurredOn;
    const totals = byDate.get(date) ?? {
      date,
      ...emptyMetricTotals(),
      selectedRevenue: 0
    };

    if (input.adPlatforms.includes(row.platform)) {
      addMetricToTotals(totals, row.metricName, row.metricValue);
    }

    if (
      row.platform === input.revenuePlatform &&
      row.metricName === input.revenueMetricName
    ) {
      totals.selectedRevenue += row.metricValue;
    }

    byDate.set(date, totals);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildCampaignPerformance(
  rows: ReportDraftMetricRow[]
): ReportCampaignPerformance[] {
  const byCampaign = new Map<string, MetricTotals>();

  for (const row of rows) {
    const campaign = row.dimensions.campaign?.trim() || "Unattributed campaign";
    const totals = byCampaign.get(campaign) ?? emptyMetricTotals();

    addMetricToTotals(totals, row.metricName, row.metricValue);
    byCampaign.set(campaign, totals);
  }

  return [...byCampaign.entries()]
    .map(([campaign, totals]) => ({
      campaign,
      ...totals,
      ctr: divide(totals.clicks, totals.impressions),
      cpc: divide(totals.spend, totals.clicks),
      costPerConversion: divide(totals.spend, totals.conversions),
      conversionRate: divide(totals.conversions, totals.clicks),
      platformRoas: divide(totals.conversionValue, totals.spend)
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10);
}

function buildPreviousPeriodComparison(input: {
  request: ReportBuildRequest;
  rows: ReportDraftMetricRow[];
  current: {
    adTotals: MetricTotals;
    selectedRevenue: number;
    derivedMetrics: DerivedMetrics;
  };
}): PreviousPeriodComparison {
  const previousAdRows = input.rows.filter((row) =>
    getAdPlatforms(input.request.adSource).includes(row.platform)
  );
  const adTotals = sumMetricTotals(previousAdRows);
  const selectedRevenue = resolveSelectedRevenue({
    revenueSource: input.request.revenueSource,
    shopifyRevenue: sumMetric(input.rows, "shopify", "revenue"),
    ga4Revenue: sumMetric(input.rows, "ga4", "revenue"),
    googleAdsConversionValue: sumMetric(
      input.rows,
      "google_ads",
      "conversion_value"
    ),
    metaPurchaseValue: sumMetric(input.rows, "meta_ads", "conversion_value"),
    manualRevenue: sumMetric(input.rows, "manual", "revenue")
  });
  const totalMarketingSpend = sumMetric(input.rows, "google_ads", "spend")
    + sumMetric(input.rows, "meta_ads", "spend");
  const derivedMetrics = calculateDerivedMetrics({
    adTotals,
    selectedRevenue,
    totalMarketingSpend
  });

  return {
    dateRange: getPreviousDateRange(input.request.dateRange),
    adTotals,
    selectedRevenue,
    derivedMetrics,
    deltas: {
      spend: buildDelta(input.current.adTotals.spend, adTotals.spend),
      revenue: buildDelta(input.current.selectedRevenue, selectedRevenue),
      conversions: buildDelta(
        input.current.adTotals.conversions,
        adTotals.conversions
      ),
      roas: buildDelta(input.current.derivedMetrics.roas, derivedMetrics.roas)
    }
  };
}

function buildPlatformSplit(
  rows: ReportDraftMetricRow[],
  totalMarketingSpend: number
): PlatformSplit[] {
  return (["google_ads", "meta_ads"] as const)
    .map((platform) => {
      const spend = sumMetric(rows, platform, "spend");
      const conversionValue = sumMetric(rows, platform, "conversion_value");

      return {
        platform,
        spend,
        conversionValue,
        spendShare: divide(spend, totalMarketingSpend),
        platformRoas: divide(conversionValue, spend)
      };
    })
    .filter((split) => split.spend > 0 || split.conversionValue > 0);
}

function buildGoalPerformance(input: {
  goals: GoalForInsights[];
  derivedMetrics: DerivedMetrics;
  blendedMetrics: BlendedMetrics;
  adTotals: MetricTotals;
  selectedRevenue: number;
}): GoalPerformance[] {
  return input.goals.map((goal) => {
    const goalType = goal.goalType.toLowerCase();
    const actualValue = getGoalActualValue({
      goalType,
      derivedMetrics: input.derivedMetrics,
      blendedMetrics: input.blendedMetrics,
      adTotals: input.adTotals,
      selectedRevenue: input.selectedRevenue
    });
    const lowerIsBetter =
      goalType.includes("cpl") ||
      goalType.includes("cpa") ||
      goalType.includes("cost");
    const status =
      actualValue === null
        ? "unknown"
        : lowerIsBetter
          ? actualValue <= goal.targetValue
            ? "met"
            : "missed"
          : actualValue >= goal.targetValue
            ? "met"
            : "missed";
    const label = formatGoalLabel(goal.goalType);

    return {
      goalType: goal.goalType,
      targetValue: goal.targetValue,
      actualValue,
      status,
      summary:
        status === "unknown"
          ? `${label} could not be evaluated from the selected data.`
          : `${label} ${status} target at ${actualValue} versus ${goal.targetValue}.`
    };
  });
}

function addMetricToTotals(
  totals: MetricTotals,
  metricName: NormalizedMetricRow["metricName"],
  metricValue: number
) {
  if (metricName === "impressions") totals.impressions += metricValue;
  if (metricName === "clicks") totals.clicks += metricValue;
  if (metricName === "spend") totals.spend += metricValue;
  if (metricName === "conversions") totals.conversions += metricValue;
  if (metricName === "conversion_value") {
    totals.conversionValue += metricValue;
  }
  if (metricName === "revenue") totals.revenue += metricValue;
  if (metricName === "orders") totals.orders += metricValue;
  if (metricName === "leads") totals.leads += metricValue;
}

function divide(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function sumMetric(
  rows: ReportDraftMetricRow[],
  platform: Platform,
  metricName: NormalizedMetricRow["metricName"]
) {
  return rows
    .filter((row) => row.platform === platform && row.metricName === metricName)
    .reduce((total, row) => total + row.metricValue, 0);
}

function sumMetricName(
  rows: ReportDraftMetricRow[],
  metricName: NormalizedMetricRow["metricName"]
) {
  return rows
    .filter((row) => row.metricName === metricName)
    .reduce((total, row) => total + row.metricValue, 0);
}

function getAdPlatforms(selection: AdSourceSelection): Platform[] {
  if (selection === "google_ads") {
    return ["google_ads"];
  }

  if (selection === "meta_ads") {
    return ["meta_ads"];
  }

  return ["google_ads", "meta_ads"];
}

function getReportPlatforms(request: ReportBuildRequest): Platform[] {
  return Array.from(
    new Set<Platform>([
      ...getAdPlatforms(request.adSource),
      getRevenuePlatform(request.revenueSource),
      "google_ads",
      "meta_ads"
    ])
  );
}

function getExpectedPlatforms(request: ReportBuildRequest): Platform[] {
  return Array.from(
    new Set<Platform>([
      ...getAdPlatforms(request.adSource),
      getRevenuePlatform(request.revenueSource)
    ])
  );
}

function getRevenuePlatform(selection: RevenueSourceSelection): Platform {
  if (selection === "shopify") return "shopify";
  if (selection === "ga4") return "ga4";
  if (selection === "google_ads_conversion_value") return "google_ads";
  if (selection === "meta_purchase_value") return "meta_ads";
  return "manual";
}

function getRevenueMetricName(selection: RevenueSourceSelection): MetricName {
  if (
    selection === "google_ads_conversion_value" ||
    selection === "meta_purchase_value"
  ) {
    return "conversion_value";
  }

  return "revenue";
}

function findPrimaryCurrency(rows: ReportDraftMetricRow[]) {
  return rows.find((row) => row.currency)?.currency ?? null;
}

function findMissingPlatforms(
  request: ReportBuildRequest,
  rows: ReportDraftMetricRow[]
) {
  const expectedPlatforms = new Set(getExpectedPlatforms(request));
  const availablePlatforms = new Set(rows.map((row) => row.platform));

  return Array.from(expectedPlatforms).filter(
    (platform) => !availablePlatforms.has(platform)
  );
}

function buildDelta(
  current: number | null,
  previous: number | null
): MetricDelta {
  const currentValue = current ?? 0;
  const previousValue = previous ?? 0;
  const absoluteChange = currentValue - previousValue;

  return {
    absoluteChange,
    percentChange:
      previousValue === 0 ? null : absoluteChange / previousValue,
    direction:
      absoluteChange > 0 ? "up" : absoluteChange < 0 ? "down" : "flat"
  };
}

function getPreviousDateRange(dateRange: DateRange): DateRange {
  const from = new Date(`${dateRange.from}T00:00:00.000Z`);
  const to = new Date(`${dateRange.to}T00:00:00.000Z`);
  const dayInMs = 24 * 60 * 60 * 1000;
  const days = Math.round((to.getTime() - from.getTime()) / dayInMs) + 1;
  const previousTo = new Date(from.getTime() - dayInMs);
  const previousFrom = new Date(previousTo.getTime() - (days - 1) * dayInMs);

  return {
    from: previousFrom.toISOString().slice(0, 10),
    to: previousTo.toISOString().slice(0, 10)
  };
}

function getGoalActualValue(input: {
  goalType: string;
  derivedMetrics: DerivedMetrics;
  blendedMetrics: BlendedMetrics;
  adTotals: MetricTotals;
  selectedRevenue: number;
}) {
  if (input.goalType.includes("roas")) return input.derivedMetrics.roas;
  if (input.goalType.includes("mer")) return input.blendedMetrics.mer;
  if (input.goalType.includes("revenue")) return input.selectedRevenue;
  if (input.goalType.includes("cpl")) return input.derivedMetrics.cpl;
  if (input.goalType.includes("spend")) return input.adTotals.spend;
  if (input.goalType.includes("lead")) return input.adTotals.leads;
  if (input.goalType.includes("order")) return input.adTotals.orders;
  if (
    input.goalType.includes("cpa") ||
    input.goalType.includes("cost_per_purchase") ||
    input.goalType.includes("cost_per_conversion")
  ) {
    return divide(input.adTotals.spend, input.adTotals.conversions);
  }

  return null;
}

function formatGoalLabel(goalType: string) {
  if (goalType.toLowerCase() === "roas") return "ROAS";
  if (goalType.toLowerCase() === "mer") return "MER";

  return goalType
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function getDaysInMonth(date: string) {
  const parsed = new Date(date);
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 0)
  ).getUTCDate();
}

function buildGoalMap(goals: GoalForInsights[]) {
  return goals.reduce<Record<string, number>>((map, goal) => {
    map[goal.goalType] = goal.targetValue;

    if (
      goal.goalType === "cpl" ||
      goal.goalType === "target_cpl" ||
      goal.goalType === "cplTarget"
    ) {
      map.cplTarget = goal.targetValue;
    }

    return map;
  }, {});
}
