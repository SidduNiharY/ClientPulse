export type InsightProvider = "rule_based" | "external_ai";

export type InsightGenerationInput = {
  metrics: Record<string, number | null>;
  goals: Record<string, number>;
  anomalies: { anomalyType: string; message: string; clientSafe: boolean }[];
};

export type InsightInput = InsightGenerationInput & {
  provider: InsightProvider;
};

export type InsightDraft = {
  insightType: string;
  text: string;
  sourceMetric: string;
};

export function generateInsightDrafts(
  input: InsightGenerationInput
): InsightDraft[] {
  return generateRuleBasedInsights(input);
}

export function generateRuleBasedInsights(
  input: InsightGenerationInput
): InsightDraft[] {
  const drafts: InsightDraft[] = [];
  const recommendedActions: InsightDraft[] = [];
  const likelyReasons: InsightDraft[] = [];
  const internalNotes: InsightDraft[] = [];

  const currentSpend = metric(input.metrics, "currentSpend", "spend");
  const previousSpend = metric(input.metrics, "previousSpend");
  const currentRevenue = metric(input.metrics, "currentRevenue", "revenue");
  const previousRevenue = metric(input.metrics, "previousRevenue");
  const currentRoas = metric(input.metrics, "currentRoas", "roas");
  const previousRoas = metric(input.metrics, "previousRoas");
  const currentCtr = metric(input.metrics, "currentCtr", "ctr");
  const previousCtr = metric(input.metrics, "previousCtr");
  const currentConversionRate = metric(
    input.metrics,
    "currentConversionRate",
    "conversionRate"
  );
  const previousConversionRate = metric(input.metrics, "previousConversionRate");
  const cpl = metric(input.metrics, "cpl");
  const cplTarget = goal(input.goals, "cplTarget", "targetCpl", "cpl");
  const shopifyRevenue = metric(input.metrics, "shopifyRevenue");
  const platformConversionValue = metric(input.metrics, "platformConversionValue");

  drafts.push({
    insightType: "executive_summary",
    text: buildExecutiveSummary({
      revenue: currentRevenue,
      spend: currentSpend,
      roas: currentRoas
    }),
    sourceMetric: currentRoas === null ? "revenue" : "roas"
  });

  const spendGrowth = growthRate(currentSpend, previousSpend);
  const revenueGrowth = growthRate(currentRevenue, previousRevenue);
  const roasGrowth = growthRate(currentRoas, previousRoas);
  const ctrGrowth = growthRate(currentCtr, previousCtr);
  const conversionRateGrowth = growthRate(
    currentConversionRate,
    previousConversionRate
  );

  if (spendGrowth !== null && revenueGrowth !== null) {
    if (spendGrowth > 0 && spendGrowth > revenueGrowth + 0.15) {
      drafts.push({
        insightType: "what_declined",
        text:
          "Spend increased faster than revenue, which may pressure ROAS if the pattern continues.",
        sourceMetric: "spend"
      });
      likelyReasons.push({
        insightType: "likely_reasons",
        text:
          "New or scaled budget may be moving into campaigns, audiences, or products with lower incremental return.",
        sourceMetric: "spend"
      });
      recommendedActions.push({
        insightType: "recommended_actions",
        text:
          "Review budget allocation across campaigns because spend increased faster than revenue.",
        sourceMetric: "spend"
      });
    } else if (revenueGrowth > spendGrowth) {
      drafts.push({
        insightType: "what_improved",
        text:
          "Revenue grew faster than spend, indicating stronger efficiency for the selected revenue source.",
        sourceMetric: "revenue"
      });
    }
  }

  if (ctrGrowth !== null && conversionRateGrowth !== null) {
    if (ctrGrowth > 0 && conversionRateGrowth < 0) {
      drafts.push({
        insightType: "what_declined",
        text:
          "CTR improved while conversion rate declined, so traffic quality or post-click experience needs review.",
        sourceMetric: "conversion_rate"
      });
      recommendedActions.push({
        insightType: "recommended_actions",
        text:
          "Run a landing page or offer review because clicks improved but conversion rate dropped.",
        sourceMetric: "conversion_rate"
      });
    } else if (ctrGrowth > 0) {
      drafts.push({
        insightType: "what_improved",
        text: "CTR improved versus the previous period.",
        sourceMetric: "ctr"
      });
    }
  }

  if (roasGrowth !== null && roasGrowth > 0) {
    drafts.push({
      insightType: "what_improved",
      text: "ROAS improved versus the previous period.",
      sourceMetric: "roas"
    });
  } else if (roasGrowth !== null && roasGrowth < 0) {
    drafts.push({
      insightType: "what_declined",
      text: "ROAS declined versus the previous period.",
      sourceMetric: "roas"
    });
  }

  if (cpl !== null && cplTarget !== null && cpl > cplTarget) {
    drafts.push({
      insightType: "what_declined",
      text: "CPL is above the configured target.",
      sourceMetric: "cpl"
    });
    recommendedActions.push({
      insightType: "recommended_actions",
      text:
        "Review lead quality and audience review inputs because CPL is above target.",
      sourceMetric: "cpl"
    });
  }

  if (
    shopifyRevenue !== null &&
    platformConversionValue !== null &&
    shopifyRevenue > platformConversionValue
  ) {
    likelyReasons.push({
      insightType: "likely_reasons",
      text:
        "Shopify revenue is higher than platform conversion value, which indicates an attribution difference between store revenue and ad-platform reporting.",
      sourceMetric: "revenue"
    });
  }

  for (const anomaly of input.anomalies) {
    if (anomaly.clientSafe) {
      likelyReasons.push({
        insightType: "likely_reasons",
        text: anomaly.message,
        sourceMetric: anomaly.anomalyType
      });
    } else {
      internalNotes.push({
        insightType: "internal_notes",
        text: anomaly.message,
        sourceMetric: anomaly.anomalyType
      });
    }
  }

  drafts.push(...likelyReasons, ...recommendedActions, ...internalNotes);

  return ensureRequiredSections(drafts);
}

export async function generateInsights(
  input: InsightInput
): Promise<InsightDraft[]> {
  if (input.provider === "rule_based") {
    return generateRuleBasedInsights(input);
  }

  return generateRuleBasedInsights(input);
}

function metric(
  metrics: Record<string, number | null>,
  primaryKey: string,
  fallbackKey?: string
): number | null {
  const value = metrics[primaryKey] ?? (fallbackKey ? metrics[fallbackKey] : null);

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function goal(
  goals: Record<string, number>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = goals[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function growthRate(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) {
    return null;
  }

  return (current - previous) / previous;
}

function buildExecutiveSummary(input: {
  revenue: number | null;
  spend: number | null;
  roas: number | null;
}) {
  if (input.revenue !== null && input.spend !== null && input.roas !== null) {
    return `Selected revenue is ${input.revenue} against ${input.spend} in spend, with ROAS at ${input.roas.toFixed(2)}.`;
  }

  if (input.revenue !== null && input.spend !== null) {
    return `Selected revenue is ${input.revenue} against ${input.spend} in spend.`;
  }

  return "Performance data is ready for review with the selected report sources.";
}

function ensureRequiredSections(drafts: InsightDraft[]) {
  return addFallbackSection(
    addFallbackSection(
      addFallbackSection(
        addFallbackSection(
          addFallbackSection(
            addFallbackSection(drafts, {
              insightType: "executive_summary",
              text:
                "Performance data is ready for review with the selected report sources.",
              sourceMetric: "revenue"
            }),
            {
              insightType: "what_improved",
              text:
                "No clear improvement signal was detected from the provided comparison metrics.",
              sourceMetric: "period_comparison"
            }
          ),
          {
            insightType: "what_declined",
            text:
              "No major decline signal was detected from the provided comparison metrics.",
            sourceMetric: "period_comparison"
          }
        ),
        {
          insightType: "likely_reasons",
          text:
            "No specific driver was isolated; review channel, campaign, and revenue-source context before finalizing the client note.",
          sourceMetric: "analysis"
        }
      ),
      {
        insightType: "recommended_actions",
        text:
          "Continue monitoring performance and validate source data before sending the report.",
        sourceMetric: "data_quality"
      }
    ),
    {
      insightType: "internal_notes",
      text:
        "Rule-based draft generated for agency review before client delivery.",
      sourceMetric: "review"
    }
  );
}

function addFallbackSection(drafts: InsightDraft[], fallback: InsightDraft) {
  if (drafts.some((draft) => draft.insightType === fallback.insightType)) {
    return drafts;
  }

  return [...drafts, fallback];
}
