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
  status: "ahead" | "behind" | "on_track";
  summary: string;
} {
  const expectedSpendByToday =
    (input.monthlyBudget / input.daysInMonth) * input.dayOfMonth;
  const pacingDifference = input.spendToDate - expectedSpendByToday;
  const projectedMonthEndSpend =
    (input.spendToDate / input.dayOfMonth) * input.daysInMonth;
  const remainingBudget = input.monthlyBudget - input.spendToDate;
  const remainingDays = Math.max(1, input.daysInMonth - input.dayOfMonth);
  const tolerance = input.monthlyBudget * 0.02;
  const status =
    Math.abs(pacingDifference) <= tolerance
      ? "on_track"
      : pacingDifference > 0
        ? "ahead"
        : "behind";

  return {
    budgetUsedPercentage: input.spendToDate / input.monthlyBudget,
    expectedSpendByToday,
    pacingDifference,
    projectedMonthEndSpend,
    remainingBudget,
    dailySpendNeeded: remainingBudget / remainingDays,
    status,
    summary: buildPacingSummary({
      status,
      pacingDifference,
      projectedMonthEndSpend
    })
  };
}

function buildPacingSummary(input: {
  status: "ahead" | "behind" | "on_track";
  pacingDifference: number;
  projectedMonthEndSpend: number;
}) {
  const absoluteDifference = Math.abs(input.pacingDifference);

  if (input.status === "on_track") {
    return `Spend is on pace and projected month-end spend is ${input.projectedMonthEndSpend}.`;
  }

  const pacePhrase =
    input.status === "ahead" ? "ahead of pace" : "behind pace";

  return `Spend is ${pacePhrase} by ${absoluteDifference}; projected month-end spend is ${input.projectedMonthEndSpend}.`;
}
