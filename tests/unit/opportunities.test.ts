import { detectOpportunities } from "@/server/reporting/opportunities";
import { describe, expect, it } from "vitest";

describe("detectOpportunities", () => {
  it("detects wasted spend, high CPC, strong products, and weak channels", () => {
    const opportunities = detectOpportunities({
      highCpcThreshold: 100,
      minSpendForWastedSpend: 1000,
      minClicksForCpc: 10,
      minRevenueForStrongProduct: 5000,
      rows: [
        {
          metricName: "spend",
          metricValue: 2500,
          dimensions: { campaign: "Prospecting", channel: "Paid social" }
        },
        {
          metricName: "clicks",
          metricValue: 20,
          dimensions: { campaign: "Prospecting", channel: "Paid social" }
        },
        {
          metricName: "conversions",
          metricValue: 0,
          dimensions: { campaign: "Prospecting", channel: "Paid social" }
        },
        {
          metricName: "revenue",
          metricValue: 7500,
          dimensions: { product: "Starter Kit" }
        }
      ]
    });

    expect(opportunities.map((item) => item.opportunityType)).toEqual([
      "strong_product",
      "wasted_spend",
      "high_cpc",
      "weak_conversion_channel"
    ]);
  });
});
