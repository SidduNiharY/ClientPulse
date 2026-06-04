import { generateInsights } from "@/server/reporting/insights";
import { describe, expect, it } from "vitest";

describe("insight drafts", () => {
  it("recommends budget allocation review when spend grows faster than revenue", async () => {
    const insights = await generateInsights({
      provider: "rule_based",
      metrics: {
        currentSpend: 150000,
        previousSpend: 100000,
        currentRevenue: 110000,
        previousRevenue: 100000
      },
      goals: {},
      anomalies: []
    });

    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          insightType: "recommended_actions",
          text: expect.stringContaining("Review budget allocation"),
          sourceMetric: "spend"
        })
      ])
    );
  });

  it("falls external AI back to rule-based drafts", async () => {
    const insights = await generateInsights({
      provider: "external_ai",
      metrics: {
        currentSpend: 150000,
        previousSpend: 100000,
        currentRevenue: 110000,
        previousRevenue: 100000
      },
      goals: {},
      anomalies: []
    });

    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining("Review budget allocation")
        })
      ])
    );
  });

  it("recommends landing page review when CTR improves and conversion rate drops", async () => {
    const insights = await generateInsights({
      provider: "rule_based",
      metrics: {
        currentCtr: 0.08,
        previousCtr: 0.04,
        currentConversionRate: 0.02,
        previousConversionRate: 0.05
      },
      goals: {},
      anomalies: []
    });

    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          insightType: "recommended_actions",
          text: expect.stringContaining("landing page or offer review"),
          sourceMetric: "conversion_rate"
        })
      ])
    );
  });

  it("recommends lead quality review when CPL exceeds target", async () => {
    const insights = await generateInsights({
      provider: "rule_based",
      metrics: {
        cpl: 1500
      },
      goals: {
        cplTarget: 1000
      },
      anomalies: []
    });

    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining("lead quality and audience review"),
          sourceMetric: "cpl"
        })
      ])
    );
  });

  it("explains attribution differences when Shopify revenue exceeds platform conversion value", async () => {
    const insights = await generateInsights({
      provider: "rule_based",
      metrics: {
        shopifyRevenue: 250000,
        platformConversionValue: 150000
      },
      goals: {},
      anomalies: []
    });

    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining("attribution difference"),
          sourceMetric: "revenue"
        })
      ])
    );
  });

  it("returns all client-review insight sections", async () => {
    const insights = await generateInsights({
      provider: "rule_based",
      metrics: {
        currentRevenue: 120000,
        previousRevenue: 100000,
        currentRoas: 3.2,
        previousRoas: 2.8
      },
      goals: {},
      anomalies: [
        {
          anomalyType: "zero_conversions",
          message: "Spend was recorded but conversions are zero",
          clientSafe: true
        }
      ]
    });

    expect(insights.map((insight) => insight.insightType)).toEqual(
      expect.arrayContaining([
        "executive_summary",
        "what_improved",
        "what_declined",
        "likely_reasons",
        "recommended_actions",
        "internal_notes"
      ])
    );
  });
});
