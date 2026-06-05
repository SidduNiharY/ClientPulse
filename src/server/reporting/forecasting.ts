type ForecastValue = number | null;

export type RunRateForecastInput = {
  spendToDate: number;
  revenueToDate: number;
  leadsToDate: number;
  elapsedDays: number;
  periodDays: number;
  budget: number | null;
};

export type RunRateForecast = {
  elapsedDays: number;
  periodDays: number;
  dailySpendRunRate: number;
  dailyRevenueRunRate: number;
  dailyLeadRunRate: number;
  projectedSpend: number;
  projectedRevenue: number;
  projectedLeads: number;
  cplToDate: ForecastValue;
  projectedCpl: ForecastValue;
  budgetUsageToDate: ForecastValue;
  projectedBudgetUsage: ForecastValue;
};

function divide(numerator: number, denominator: number): ForecastValue {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function positiveDayCount(value: number) {
  return Math.max(1, Math.floor(value));
}

export function calculateRunRateForecast(
  input: RunRateForecastInput
): RunRateForecast {
  const elapsedDays = positiveDayCount(input.elapsedDays);
  const periodDays = Math.max(elapsedDays, positiveDayCount(input.periodDays));
  const dailySpendRunRate = input.spendToDate / elapsedDays;
  const dailyRevenueRunRate = input.revenueToDate / elapsedDays;
  const dailyLeadRunRate = input.leadsToDate / elapsedDays;
  const projectedSpend = dailySpendRunRate * periodDays;
  const projectedRevenue = dailyRevenueRunRate * periodDays;
  const projectedLeads = dailyLeadRunRate * periodDays;

  return {
    elapsedDays,
    periodDays,
    dailySpendRunRate,
    dailyRevenueRunRate,
    dailyLeadRunRate,
    projectedSpend,
    projectedRevenue,
    projectedLeads,
    cplToDate: divide(input.spendToDate, input.leadsToDate),
    projectedCpl: divide(projectedSpend, projectedLeads),
    budgetUsageToDate:
      input.budget === null ? null : divide(input.spendToDate, input.budget),
    projectedBudgetUsage:
      input.budget === null ? null : divide(projectedSpend, input.budget)
  };
}
