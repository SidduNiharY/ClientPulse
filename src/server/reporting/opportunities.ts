export type OpportunityMetricRow = {
  metricName: string;
  metricValue: number;
  dimensions?: Record<string, string> | null;
};

export type OpportunityResult = {
  opportunityType:
    | "wasted_spend"
    | "high_cpc"
    | "strong_product"
    | "weak_conversion_channel";
  severity: "info" | "warning" | "critical";
  dimensionName: "campaign" | "product" | "channel";
  dimensionValue: string;
  message: string;
  impactMetric: number;
  clientSafe: boolean;
};

type DimensionTotals = {
  spend: number;
  clicks: number;
  conversions: number;
  revenue: number;
  conversionValue: number;
};

export function detectOpportunities(input: {
  rows: OpportunityMetricRow[];
  highCpcThreshold?: number;
  weakConversionRateThreshold?: number;
  minSpendForWastedSpend?: number;
  minClicksForCpc?: number;
  minRevenueForStrongProduct?: number;
}): OpportunityResult[] {
  const highCpcThreshold = input.highCpcThreshold ?? 250;
  const weakConversionRateThreshold = input.weakConversionRateThreshold ?? 0.01;
  const minSpendForWastedSpend = input.minSpendForWastedSpend ?? 10000;
  const minClicksForCpc = input.minClicksForCpc ?? 50;
  const minRevenueForStrongProduct = input.minRevenueForStrongProduct ?? 50000;
  const opportunities: OpportunityResult[] = [];

  for (const [campaign, totals] of groupByDimension(input.rows, "campaign")) {
    if (totals.spend >= minSpendForWastedSpend && totals.conversions === 0) {
      opportunities.push({
        opportunityType: "wasted_spend",
        severity: "critical",
        dimensionName: "campaign",
        dimensionValue: campaign,
        message: `${campaign} has spend but no recorded conversions.`,
        impactMetric: totals.spend,
        clientSafe: false
      });
    }

    const cpc = divide(totals.spend, totals.clicks);

    if (
      cpc !== null &&
      totals.clicks >= minClicksForCpc &&
      cpc >= highCpcThreshold
    ) {
      opportunities.push({
        opportunityType: "high_cpc",
        severity: "warning",
        dimensionName: "campaign",
        dimensionValue: campaign,
        message: `${campaign} CPC is above the reporting threshold.`,
        impactMetric: cpc,
        clientSafe: true
      });
    }
  }

  for (const [product, totals] of groupByDimension(input.rows, "product")) {
    if (totals.revenue >= minRevenueForStrongProduct) {
      opportunities.push({
        opportunityType: "strong_product",
        severity: "info",
        dimensionName: "product",
        dimensionValue: product,
        message: `${product} is a strong revenue contributor.`,
        impactMetric: totals.revenue,
        clientSafe: true
      });
    }
  }

  for (const [channel, totals] of groupByDimension(input.rows, "channel")) {
    const conversionRate = divide(totals.conversions, totals.clicks);

    if (
      conversionRate !== null &&
      totals.clicks >= minClicksForCpc &&
      conversionRate <= weakConversionRateThreshold
    ) {
      opportunities.push({
        opportunityType: "weak_conversion_channel",
        severity: "warning",
        dimensionName: "channel",
        dimensionValue: channel,
        message: `${channel} has weak conversion efficiency.`,
        impactMetric: conversionRate,
        clientSafe: true
      });
    }
  }

  return opportunities.sort((a, b) => b.impactMetric - a.impactMetric);
}

function groupByDimension(
  rows: OpportunityMetricRow[],
  dimensionName: "campaign" | "product" | "channel"
) {
  const grouped = new Map<string, DimensionTotals>();

  for (const row of rows) {
    const dimensionValue = row.dimensions?.[dimensionName]?.trim();

    if (!dimensionValue) continue;

    const totals = grouped.get(dimensionValue) ?? {
      spend: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      conversionValue: 0
    };

    if (row.metricName === "spend") totals.spend += row.metricValue;
    if (row.metricName === "clicks") totals.clicks += row.metricValue;
    if (row.metricName === "conversions") {
      totals.conversions += row.metricValue;
    }
    if (row.metricName === "revenue") totals.revenue += row.metricValue;
    if (row.metricName === "conversion_value") {
      totals.conversionValue += row.metricValue;
    }

    grouped.set(dimensionValue, totals);
  }

  return grouped;
}

function divide(numerator: number, denominator: number) {
  if (denominator === 0) return null;
  return numerator / denominator;
}
