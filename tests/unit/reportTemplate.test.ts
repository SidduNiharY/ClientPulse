import { renderReportHtml } from "@/server/pdf/reportTemplate";
import type { ReportDraftSnapshot } from "@/server/reporting/reportBuilder";
import { describe, expect, it } from "vitest";

const snapshot: ReportDraftSnapshot = {
  status: "needs_review",
  clientId: "client_1",
  clientName: "Demo Ecommerce Client",
  reportType: "weekly",
  dateRange: { from: "2026-06-01", to: "2026-06-07" },
  adSource: "google_ads_meta_ads",
  revenueSource: "shopify",
  adTotals: {
    impressions: 100000,
    clicks: 5000,
    spend: 25000,
    conversions: 200,
    conversionValue: 85000,
    revenue: 0,
    orders: 400,
    leads: 0
  },
  selectedRevenue: 100000,
  totalMarketingSpend: 25000,
  derivedMetrics: {
    ctr: 0.05,
    cpc: 5,
    cpl: null,
    conversionRate: 0.04,
    aov: 250,
    roas: 4,
    mer: 4,
    revenuePerAdClick: 20
  },
  sourceTrace: [],
  sourceTraceSummary: [
    {
      platform: "shopify",
      connectorType: "csv_upload",
      sourceAccountId: "demo-store.myshopify.com",
      sourceReference: "shopify-week.csv",
      metricCount: 1,
      importedAt: "2026-06-04T00:00:00.000Z"
    }
  ],
  dataQuality: {
    score: 100,
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
  anomalies: [],
  budgetPacing: null,
  insights: [
    {
      insightType: "performance_summary",
      text: "ROAS is 4.00 from selected revenue.",
      sourceMetric: "roas"
    }
  ],
  context: {
    accountMappingsLoaded: 4,
    goalsLoaded: 1,
    budgetsLoaded: 0
  }
};

const agencySnapshot = {
  ...snapshot,
  currency: "INR",
  adTotals: {
    impressions: 150000,
    clicks: 7000,
    spend: 25000,
    conversions: 320,
    conversionValue: 120000,
    revenue: 0,
    orders: 400,
    leads: 80
  },
  selectedRevenue: 140000,
  totalMarketingSpend: 25000,
  derivedMetrics: {
    ctr: 7000 / 150000,
    cpc: 25000 / 7000,
    cpl: 25000 / 80,
    conversionRate: 320 / 7000,
    aov: 350,
    roas: 5.6,
    mer: 5.6,
    revenuePerAdClick: 20
  },
  dailyPerformance: [
    {
      date: "2026-06-01",
      impressions: 70000,
      clicks: 3200,
      spend: 12000,
      conversions: 140,
      conversionValue: 54000,
      revenue: 0,
      orders: 160,
      leads: 36,
      selectedRevenue: 62000
    },
    {
      date: "2026-06-02",
      impressions: 80000,
      clicks: 3800,
      spend: 13000,
      conversions: 180,
      conversionValue: 66000,
      revenue: 0,
      orders: 240,
      leads: 44,
      selectedRevenue: 78000
    }
  ],
  campaignPerformance: [
    {
      campaign: "Brand Search",
      impressions: 50000,
      clicks: 2800,
      spend: 9000,
      conversions: 155,
      conversionValue: 72000,
      revenue: 0,
      orders: 190,
      leads: 22,
      ctr: 2800 / 50000,
      cpc: 9000 / 2800,
      costPerConversion: 9000 / 155,
      conversionRate: 155 / 2800,
      platformRoas: 8
    },
    {
      campaign: "Meta Prospecting",
      impressions: 100000,
      clicks: 4200,
      spend: 16000,
      conversions: 165,
      conversionValue: 48000,
      revenue: 0,
      orders: 210,
      leads: 58,
      ctr: 4200 / 100000,
      cpc: 16000 / 4200,
      costPerConversion: 16000 / 165,
      conversionRate: 165 / 4200,
      platformRoas: 3
    }
  ],
  platformPerformance: [
    {
      platform: "google_ads",
      impressions: 50000,
      clicks: 2800,
      spend: 9000,
      conversions: 155,
      conversionValue: 72000,
      revenue: 0,
      orders: 190,
      leads: 22
    },
    {
      platform: "meta_ads",
      impressions: 100000,
      clicks: 4200,
      spend: 16000,
      conversions: 165,
      conversionValue: 48000,
      revenue: 0,
      orders: 210,
      leads: 58
    }
  ],
  opportunities: [
    {
      opportunityType: "high_cpc",
      severity: "warning",
      dimensionName: "campaign",
      dimensionValue: "Brand Search",
      message: "Shift incremental budget toward Brand Search while ROAS holds above goal.",
      impactMetric: 72000,
      clientSafe: true
    }
  ],
  anomalies: [
    {
      anomalyType: "spend_spike",
      severity: "warning",
      message: "Meta spend increased faster than conversion value.",
      clientSafe: true
    },
    {
      anomalyType: "internal_token_warning",
      severity: "critical",
      message: "Connector token needs internal review.",
      clientSafe: false
    }
  ],
  budgetPacing: {
    expectedSpendByToday: 23333.333333333336,
    projectedMonthEndSpend: 107142.85714285714,
    remainingBudget: 75000,
    dailySpendNeeded: 3260.8695652173915,
    budgetUsedPercentage: 0.25,
    pacingDifference: 1666.6666666666642,
    status: "on_track",
    summary: "Spend is on pace and projected month-end spend is 107142.85714285714."
  },
  sourceTraceSummary: [
    ...snapshot.sourceTraceSummary,
    {
      platform: "google_ads",
      connectorType: "csv_upload",
      sourceAccountId: "123-456-7890",
      sourceReference: "google-ads-week.csv",
      metricCount: 6,
      importedAt: "2026-06-04T00:00:00.000Z"
    },
    {
      platform: "meta_ads",
      connectorType: "csv_upload",
      sourceAccountId: "act_123",
      sourceReference: "meta-ads-week.csv",
      metricCount: 6,
      importedAt: "2026-06-04T00:00:00.000Z"
    }
  ],
  insights: [
    {
      insightType: "executive_summary",
      text: "Blended media efficiency is above target with Brand Search carrying most conversion value.",
      sourceMetric: "roas"
    },
    {
      insightType: "recommended_actions",
      text: "Rebalance Meta prospecting toward audiences producing qualified leads.",
      sourceMetric: "cpl"
    }
  ],
  agentNarratives: {
    metricAnalysis: {
      agentName: "metric_analysis_agent",
      promptVersion: "metric-analysis-v1",
      generatedAt: "2026-06-08T00:00:00.000Z",
      findings: [
        {
          title: "Revenue efficiency",
          detail: "Selected revenue is INR 140,000 against INR 25,000 in spend.",
          sourceMetric: "roas",
          severity: "positive"
        }
      ]
    },
    domainTrends: {
      agentName: "domain_trend_agent",
      promptVersion: "domain-trends-v1",
      generatedAt: "2026-06-08T00:00:00.000Z",
      query: "ecommerce marketing trends google ads meta ads shopify",
      items: [
        {
          title: "Retail brands increase first-party data investment",
          summary:
            "Recent ecommerce coverage reinforces the need to improve owned data capture before scaling prospecting.",
          sourceName: "example.com",
          url: "https://example.com/retail-data",
          publishedAt: "2026-06-07T00:00:00.000Z"
        }
      ]
    }
  },
  context: {
    accountMappingsLoaded: 4,
    goalsLoaded: 2,
    budgetsLoaded: 1
  }
} as ReportDraftSnapshot & {
  platformPerformance: Array<{
    platform: "google_ads" | "meta_ads";
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    conversionValue: number;
    revenue: number;
    orders: number;
    leads: number;
  }>;
};

describe("report template", () => {
  it("renders master ecommerce report sections", () => {
    const html = renderReportHtml({
      clientName: "Demo Ecommerce Client",
      periodLabel: "2026-06-01 to 2026-06-07",
      snapshot
    });

    for (const text of [
      "Demo Ecommerce Client",
      "Shopify revenue",
      "Blended ROAS",
      "Source Notes"
    ]) {
      expect(html).toContain(text);
    }
  });

  it("renders a premium agency report with platform split and client-safe notes", () => {
    const html = renderReportHtml({
      clientName: "Demo Ecommerce Client",
      periodLabel: "2026-06-01 to 2026-06-07",
      snapshot: agencySnapshot
    });

    for (const text of [
      "Executive Readout",
      "KPI Summary",
      "Google Ads vs Meta Ads Split",
      "Daily Performance Trend",
      "Top Campaigns",
      "Blended ROAS",
      "MER",
      "Goals, Pacing &amp; Recommendations",
      "Agent Analysis &amp; Market Context",
      "Numbers Agent",
      "Domain News Agent",
      "Retail brands increase first-party data investment",
      "Client-Safe Anomalies",
      "Source Notes",
      "Google Ads",
      "Meta Ads",
      "INR 9,000",
      "INR 16,000",
      "8.00x",
      "3.00x",
      "2 goals loaded",
      "Meta spend increased faster than conversion value."
    ]) {
      expect(html).toContain(text);
    }

    expect(html).not.toContain("Connector token needs internal review.");
  });
});
