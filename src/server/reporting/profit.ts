export type ProfitMetricsInput = {
  revenue: number;
  refunds: number;
  discounts: number;
  cogs: number;
  adSpend: number;
};

export type ProfitMetrics = {
  netRevenue: number;
  grossProfit: number;
  contributionMargin: number;
  profitRoas: number | null;
};

export function calculateProfitMetrics(
  input: ProfitMetricsInput
): ProfitMetrics {
  const netRevenue = input.revenue - input.refunds - input.discounts;
  const grossProfit = netRevenue - input.cogs;
  const contributionMargin = grossProfit - input.adSpend;

  return {
    netRevenue,
    grossProfit,
    contributionMargin,
    profitRoas: input.adSpend === 0 ? null : grossProfit / input.adSpend
  };
}
