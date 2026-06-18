import { renderPdfFromHtml } from "@/server/pdf/renderPdf";
import { renderReportHtml } from "@/server/pdf/reportTemplate";
import type {
  ReportDailyPerformance,
  ReportDraftSnapshot,
  ReportType
} from "@/server/reporting/reportBuilder";
import { describe, expect, it } from "vitest";

function makeSnapshot(reportType: ReportType): ReportDraftSnapshot {
  const days = reportType === "weekly" ? 7 : 31;
  const multiplier = reportType === "weekly" ? 1 : 4;

  return {
    status: "needs_review",
    clientId: "pagination-client",
    clientName: "Northstar Commerce",
    reportType,
    dateRange:
      reportType === "weekly"
        ? { from: "2026-06-01", to: "2026-06-07" }
        : { from: "2026-05-01", to: "2026-05-31" },
    adSource: "google_ads_meta_ads",
    revenueSource: "shopify",
    currency: "USD",
    adTotals: {
      impressions: 120_000 * multiplier,
      clicks: 6_000 * multiplier,
      spend: 18_000 * multiplier,
      conversions: 360 * multiplier,
      conversionValue: 90_000 * multiplier,
      revenue: 0,
      orders: 420 * multiplier,
      leads: 180 * multiplier
    },
    selectedRevenue: 108_000 * multiplier,
    totalMarketingSpend: 18_000 * multiplier,
    derivedMetrics: {
      ctr: 0.05,
      cpc: 3,
      cpl: 100,
      conversionRate: 0.06,
      aov: 257.14,
      roas: 6,
      mer: 6,
      revenuePerAdClick: 18
    },
    platformSplit: [
      {
        platform: "google_ads",
        spend: 7_200 * multiplier,
        conversionValue: 54_000 * multiplier,
        spendShare: 0.4,
        platformRoas: 7.5
      },
      {
        platform: "meta_ads",
        spend: 10_800 * multiplier,
        conversionValue: 36_000 * multiplier,
        spendShare: 0.6,
        platformRoas: 10 / 3
      }
    ],
    previousPeriodComparison: {
      dateRange:
        reportType === "weekly"
          ? { from: "2026-05-25", to: "2026-05-31" }
          : { from: "2026-03-31", to: "2026-04-30" },
      adTotals: {
        impressions: 110_000 * multiplier,
        clicks: 5_500 * multiplier,
        spend: 17_000 * multiplier,
        conversions: 330 * multiplier,
        conversionValue: 82_000 * multiplier,
        revenue: 0,
        orders: 390 * multiplier,
        leads: 160 * multiplier
      },
      selectedRevenue: 99_000 * multiplier,
      derivedMetrics: {
        ctr: 0.05,
        cpc: 17_000 / 5_500,
        cpl: 17_000 / 160,
        conversionRate: 330 / 5_500,
        aov: 99_000 / 390,
        roas: 99_000 / 17_000,
        mer: 99_000 / 17_000,
        revenuePerAdClick: 18
      },
      deltas: {
        spend: {
          absoluteChange: 1_000 * multiplier,
          percentChange: 1 / 17,
          direction: "up"
        },
        revenue: {
          absoluteChange: 9_000 * multiplier,
          percentChange: 1 / 11,
          direction: "up"
        },
        conversions: {
          absoluteChange: 30 * multiplier,
          percentChange: 1 / 11,
          direction: "up"
        },
        roas: {
          absoluteChange: 6 - 99_000 / 17_000,
          percentChange: 0.0303,
          direction: "up"
        }
      }
    },
    dailyPerformance: makeDailyPerformance(days),
    campaignPerformance: makeCampaignPerformance(10),
    opportunities: Array.from({ length: 6 }, (_, index) => ({
      opportunityType: "strong_product",
      severity: "warning",
      dimensionName: "campaign",
      dimensionValue: `Campaign ${index + 1}`,
      message: `Shift incremental budget toward proven campaign ${index + 1} while efficiency remains above target.`,
      impactMetric: 25_000 - index * 1_000,
      clientSafe: true
    })),
    sourceTrace: [],
    sourceTraceSummary: [
      {
        platform: "google_ads",
        connectorType: "csv_upload",
        sourceAccountId: "123-456-7890",
        sourceReference: "google-ads.csv",
        metricCount: 6,
        importedAt: "2026-06-08T08:00:00.000Z"
      },
      {
        platform: "shopify",
        connectorType: "csv_upload",
        sourceAccountId: "northstar.myshopify.com",
        sourceReference: "shopify-orders.csv",
        metricCount: 3,
        importedAt: "2026-06-08T08:05:00.000Z"
      },
      {
        platform: "meta_ads",
        connectorType: "csv_upload",
        sourceAccountId: "act_123456789",
        sourceReference: "meta-ads.csv",
        metricCount: 6,
        importedAt: "2026-06-08T08:06:00.000Z"
      },
      {
        platform: "ga4",
        connectorType: "csv_upload",
        sourceAccountId: "properties/123456",
        sourceReference: "ga4.csv",
        metricCount: 4,
        importedAt: "2026-06-08T08:07:00.000Z"
      }
    ],
    dataQuality: {
      score: 96,
      rating: "good",
      factors: {
        selectedSourcesSynced: true,
        dataFresh: true,
        revenueSourceAvailable: true,
        hasCriticalMissingMetrics: false,
        hasExpiredToken: false,
        rawRowsStored: true
      }
    },
    anomalies: Array.from({ length: 5 }, (_, index) => ({
      anomalyType: `client_safe_watch_${index + 1}`,
      severity: "warning" as const,
      message: `Performance watch item ${index + 1} needs monitoring before the next reporting period closes.`,
      clientSafe: true
    })),
    budgetPacing: {
      expectedSpendByToday: 17_500 * multiplier,
      projectedMonthEndSpend: 82_000 * multiplier,
      remainingBudget: 22_000 * multiplier,
      dailySpendNeeded: 3_100,
      budgetUsedPercentage: 0.68,
      pacingDifference: 500,
      status: "on_track",
      summary: "Spend is on track against the configured monthly budget."
    },
    goalPerformance: [
      {
        goalType: "roas",
        targetValue: 4,
        actualValue: 6,
        status: "met",
        summary: "ROAS met target at 6 versus 4."
      },
      {
        goalType: "cpl",
        targetValue: 120,
        actualValue: 100,
        status: "met",
        summary: "CPL met target at 100 versus 120."
      }
    ],
    insights: [
      {
        insightType: "executive_summary",
        text: "Revenue efficiency remained strong while acquisition volume increased.",
        sourceMetric: "roas"
      },
      {
        insightType: "what_improved",
        text: "Brand search produced the strongest return on ad spend while conversion volume expanded.",
        sourceMetric: "roas"
      },
      {
        insightType: "what_declined",
        text: "Prospecting cost per conversion increased as creative frequency rose in the largest audience.",
        sourceMetric: "cost_per_conversion"
      },
      {
        insightType: "likely_reasons",
        text: "Higher branded demand and feed coverage explain most of the efficiency gain.",
        sourceMetric: "campaign_mix"
      },
      {
        insightType: "recommended_actions",
        text: "Continue scaling the highest-converting search themes while protecting efficiency.",
        sourceMetric: "conversions"
      }
    ],
    agentNarratives: {
      metricAnalysis: {
        agentName: "metric_analysis_agent",
        promptVersion: "metric-analysis-v1",
        generatedAt: "2026-06-08T09:00:00.000Z",
        findings: Array.from({ length: 5 }, (_, index) => ({
          title: `Numeric finding ${index + 1}`,
          detail: `The report shows a measured performance signal ${index + 1} supported by spend, revenue, conversion, and efficiency data.`,
          sourceMetric: `metric_${index + 1}`,
          severity: index === 1 ? ("watch" as const) : ("positive" as const)
        }))
      },
      domainTrends: {
        agentName: "domain_trend_agent",
        promptVersion: "domain-trends-v1",
        generatedAt: "2026-06-08T09:00:00.000Z",
        query: "ecommerce marketing trends google ads meta ads shopify",
        items: Array.from({ length: 3 }, (_, index) => ({
          title: `Sourced domain trend ${index + 1} affecting ecommerce acquisition strategy`,
          summary: `Recent coverage connects trend ${index + 1} to channel mix, messaging, and offer positioning for the client.`,
          sourceName: `publisher-${index + 1}.example`,
          url: `https://publisher-${index + 1}.example/trend`,
          publishedAt: "2026-06-07T00:00:00.000Z"
        }))
      }
    },
    context: {
      accountMappingsLoaded: 3,
      goalsLoaded: 2,
      budgetsLoaded: 0
    }
  };
}

function makeCampaignPerformance(
  count: number
): NonNullable<ReportDraftSnapshot["campaignPerformance"]> {
  return Array.from({ length: count }, (_, index) => {
    const impressions = 42_000 + index * 3_200;
    const clicks = 3_100 + index * 140;
    const spend = 6_200 + index * 650;
    const conversions = 210 + index * 13;
    const conversionValue = 48_000 + index * 3_800;

    return {
      campaign: `Campaign ${index + 1} — Long descriptive acquisition name`,
      impressions,
      clicks,
      spend,
      conversions,
      conversionValue,
      revenue: 0,
      orders: 230 + index * 12,
      leads: 70 + index * 5,
      ctr: clicks / impressions,
      cpc: spend / clicks,
      costPerConversion: spend / conversions,
      conversionRate: conversions / clicks,
      platformRoas: conversionValue / spend
    };
  });
}

function makeDailyPerformance(days: number): ReportDailyPerformance[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(2026, days === 7 ? 5 : 4, index + 1));
    const spend = 2_200 + index * 37;
    const conversions = 42 + (index % 6);

    return {
      date: date.toISOString().slice(0, 10),
      impressions: 15_000 + index * 240,
      clicks: 720 + index * 11,
      spend,
      conversions,
      conversionValue: spend * 5,
      revenue: 0,
      orders: conversions + 8,
      leads: 18 + (index % 5),
      selectedRevenue: spend * 6
    };
  });
}

function getPdfPageCount(pdf: Buffer): number {
  return pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

async function renderPageCount(reportType: ReportType): Promise<number> {
  const snapshot = makeSnapshot(reportType);
  const html = renderReportHtml({
    clientName: snapshot.clientName,
    periodLabel: `${snapshot.dateRange.from} to ${snapshot.dateRange.to}`,
    snapshot
  });
  const pdf = await renderPdfFromHtml(html);

  return getPdfPageCount(pdf);
}

describe("report PDF pagination", () => {
  it(
    "keeps weekly reports to one page",
    async () => {
      expect(await renderPageCount("weekly")).toBe(1);
    },
    60_000
  );

  it(
    "keeps monthly reports between one and two pages",
    async () => {
      const pageCount = await renderPageCount("monthly");

      expect(pageCount).toBeGreaterThanOrEqual(1);
      expect(pageCount).toBeLessThanOrEqual(2);
    },
    60_000
  );
});
