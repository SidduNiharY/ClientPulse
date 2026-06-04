import { calculateBudgetPacing } from "@/server/reporting/budgetPacing";
import { describe, expect, it } from "vitest";

describe("calculateBudgetPacing", () => {
  it("calculates projected spend and remaining budget", () => {
    const pacing = calculateBudgetPacing({
      monthlyBudget: 300000,
      spendToDate: 120000,
      dayOfMonth: 10,
      daysInMonth: 30
    });

    expect(pacing.expectedSpendByToday).toBe(100000);
    expect(pacing.pacingDifference).toBe(20000);
    expect(pacing.projectedMonthEndSpend).toBe(360000);
    expect(pacing.remainingBudget).toBe(180000);
  });
});
