export function calculateBudgetPacing(input: {
  monthlyBudget: number;
  spendToDate: number;
  dayOfMonth: number;
  daysInMonth: number;
}): {
  budgetUsedPercentage: number;
  expectedSpendByToday: number;
  pacingDifference: number;
  projectedMonthEndSpend: number;
  remainingBudget: number;
  dailySpendNeeded: number;
} {
  const expectedSpendByToday =
    (input.monthlyBudget / input.daysInMonth) * input.dayOfMonth;
  const pacingDifference = input.spendToDate - expectedSpendByToday;
  const projectedMonthEndSpend =
    (input.spendToDate / input.dayOfMonth) * input.daysInMonth;
  const remainingBudget = input.monthlyBudget - input.spendToDate;
  const remainingDays = Math.max(1, input.daysInMonth - input.dayOfMonth);

  return {
    budgetUsedPercentage: input.spendToDate / input.monthlyBudget,
    expectedSpendByToday,
    pacingDifference,
    projectedMonthEndSpend,
    remainingBudget,
    dailySpendNeeded: remainingBudget / remainingDays
  };
}
