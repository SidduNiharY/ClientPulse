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
import { generateRuleBasedInsights } from "./insights";
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
  type SourceTraceSummary
} from "./sourceTrace";

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
  dailyPerformance?: ReportDailyPerformance[];
  campaignPerformance?: ReportCampaignPerformance[];
  opportunities?: OpportunityResult[];
  sourceTrace: SourceTrace[];
  sourceTraceSummary: SourceTraceSummary[];
  dataQuality: ReturnType<typeof scoreDataQuality>;
  anomalies: AnomalyResult[];
  budgetPacing: ReturnType<typeof calculateBudgetPacing> | null;
  insights: ReportInsightDraft[];
  context: {
    accountMappingsLoaded: number;
    goalsLoaded: number;
    budgetsLoaded: number;
  };
};

export function buildReportDraftSnapshot(input: {
  request: ReportBuildRequest;
  clientName: string;
  metricRows: ReportDraftMetricRow[];
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
  const dailyPerformance = buildDailyPerformance({
    rows: input.metricRows,
    adPlatforms: getAdPlatforms(input.request.adSource),
    revenuePlatform,
    revenueMetricName
  });
  const campaignPerformance = buildCampaignPerformance(adRows);
  const opportunities = detectOpportunities({ rows: adRows }).slice(0, 8);
  const missingPlatforms = findMissingPlatforms(input.request, input.metricRows);
  const dataQuality = scoreDataQuality({
    selectedSourcesSynced: missingPlatforms.length === 0,
    dataFresh: input.metricRows.length > 0,
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
    previous: {
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
      shopifyRevenue,
      platformConversionValue: googleAdsConversionValue + metaPurchaseValue
    },
    goals: buildGoalMap(input.goals ?? []),
    anomalies: anomalies.map((anomaly) => ({
      anomalyType: anomaly.anomalyType,
      message: anomaly.message,
      clientSafe: anomaly.clientSafe
    }))
  });

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
    dailyPerformance,
    campaignPerformance,
    opportunities,
    sourceTrace: collectSourceTraceDetails(input.metricRows),
    sourceTraceSummary: buildSourceTraceSummary(input.metricRows),
    dataQuality,
    anomalies,
    budgetPacing,
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
  const metricRows = await db.metricRow.findMany({
    where: {
      clientId: request.clientId,
      occurredOn: {
        gte: new Date(request.dateRange.from),
        lte: new Date(request.dateRange.to)
      },
      syncRun: {
        status: "succeeded"
      }
    }
  });
  const draft = buildReportDraftSnapshot({
    request,
    clientName: client.name,
    metricRows: metricRows.map((row) => ({
      clientId: row.clientId,
      platform: row.platform,
      ingestionMethod: row.ingestionMethod,
      sourceAccountId: row.sourceAccountId,
      metricName: row.metricName as NormalizedMetricRow["metricName"],
      metricValue: Number(row.metricValue),
      currency: row.currency,
      occurredOn: row.occurredOn.toISOString().slice(0, 10),
      dimensions: row.dimensions as Record<string, string>,
      sourceTrace: {
        platform: row.platform,
        connectorType: row.ingestionMethod,
        sourceAccountId: row.sourceAccountId,
        originalFieldName: row.originalFieldName,
        sourceReference: row.sourceReference,
        syncRunId: row.syncRunId,
        dateRange: {
          from: row.occurredOn.toISOString().slice(0, 10),
          to: row.occurredOn.toISOString().slice(0, 10)
        },
        importedAt: row.importedAt.toISOString()
      }
    })),
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
  const expectedPlatforms = new Set<Platform>([
    ...getAdPlatforms(request.adSource),
    getRevenuePlatform(request.revenueSource)
  ]);
  const availablePlatforms = new Set(rows.map((row) => row.platform));

  return Array.from(expectedPlatforms).filter(
    (platform) => !availablePlatforms.has(platform)
  );
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
