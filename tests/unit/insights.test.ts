import { generateInsights } from "@/server/reporting/insights";
import { describe, expect, it, vi } from "vitest";

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

  it("passes only reporting context to agent-assisted providers", async () => {
    const agent = vi.fn(async (context: unknown) => {
      void context;

      return [
        {
          insightType: "executive_summary",
          text: "Agent summary from reporting context.",
          sourceMetric: "roas"
        }
      ];
    });

    const insights = await generateInsights({
      provider: "agent_assisted",
      agent,
      metrics: {
        currentSpend: 150000,
        currentRevenue: 300000,
        currentRoas: 2
      },
      goals: {
        roas: 1.8
      },
      anomalies: [
        {
          anomalyType: "spend_spike",
          message: "Spend increased by at least 50%",
          clientSafe: true
        }
      ],
      freshness: {
        latestImportedAt: "2026-06-08T10:00:00.000Z",
        stalePlatforms: [],
        checkedAt: "2026-06-08T12:00:00.000Z"
      }
    });

    expect(agent).toHaveBeenCalledTimes(1);
    const agentContext = agent.mock.calls[0][0] as Record<string, unknown>;

    expect(Object.keys(agentContext).sort()).toEqual([
      "anomalies",
      "freshness",
      "goals",
      "metrics"
    ]);
    expect(insights).toEqual([
      expect.objectContaining({
        text: "Agent summary from reporting context."
      })
    ]);
  });

  it("falls agent-assisted insight failures back to rule-based drafts", async () => {
    const insights = await generateInsights({
      provider: "agent_assisted",
      agent: async () => {
        throw new Error("agent unavailable");
      },
      metrics: {
        currentSpend: 150000,
        previousSpend: 100000,
        currentRevenue: 110000,
        previousRevenue: 100000
      },
      goals: {},
      anomalies: [],
      freshness: {
        latestImportedAt: "2026-06-08T10:00:00.000Z",
        stalePlatforms: [],
        checkedAt: "2026-06-08T12:00:00.000Z"
      }
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
