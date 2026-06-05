import { calculateRunRateForecast } from "@/server/reporting/forecasting";
import { describe, expect, it } from "vitest";

describe("calculateRunRateForecast", () => {
  it("projects spend, revenue, leads, CPL, and budget usage from run rate", () => {
    const forecast = calculateRunRateForecast({
      spendToDate: 120000,
      revenueToDate: 480000,
      leadsToDate: 60,
      elapsedDays: 10,
      periodDays: 30,
      budget: 300000
    });

    expect(forecast.dailySpendRunRate).toBe(12000);
    expect(forecast.projectedSpend).toBe(360000);
    expect(forecast.projectedRevenue).toBe(1440000);
    expect(forecast.projectedLeads).toBe(180);
    expect(forecast.cplToDate).toBe(2000);
    expect(forecast.projectedCpl).toBe(2000);
    expect(forecast.budgetUsageToDate).toBe(0.4);
    expect(forecast.projectedBudgetUsage).toBe(1.2);
  });

  it("keeps ratio forecasts null when the denominator is unavailable", () => {
    const forecast = calculateRunRateForecast({
      spendToDate: 5000,
      revenueToDate: 0,
      leadsToDate: 0,
      elapsedDays: 0,
      periodDays: 0,
      budget: null
    });

    expect(forecast.elapsedDays).toBe(1);
    expect(forecast.periodDays).toBe(1);
    expect(forecast.projectedCpl).toBeNull();
    expect(forecast.budgetUsageToDate).toBeNull();
  });
});
