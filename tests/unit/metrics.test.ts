import {
  calculateDerivedMetrics,
  resolveSelectedRevenue
} from "@/server/reporting/metrics";
import { describe, expect, it } from "vitest";

describe("reporting metrics", () => {
  it("calculates blended paid media ROAS from selected revenue source", () => {
    const selectedRevenue = resolveSelectedRevenue({
      revenueSource: "shopify",
      shopifyRevenue: 100000,
      ga4Revenue: 90000,
      googleAdsConversionValue: 85000,
      metaPurchaseValue: 80000,
      manualRevenue: 0
    });

    const metrics = calculateDerivedMetrics({
      selectedRevenue,
      totalMarketingSpend: 25000,
      adTotals: {
        impressions: 100000,
        clicks: 5000,
        spend: 25000,
        conversions: 200,
        conversionValue: 85000,
        revenue: selectedRevenue,
        orders: 400,
        leads: 0
      }
    });

    expect(metrics.roas).toBe(4);
    expect(metrics.mer).toBe(4);
    expect(metrics.ctr).toBe(0.05);
    expect(metrics.cpc).toBe(5);
    expect(metrics.aov).toBe(250);
  });
});
