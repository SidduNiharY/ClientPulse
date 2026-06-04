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
      "Source notes"
    ]) {
      expect(html).toContain(text);
    }
  });
});
