import { calculateProfitMetrics } from "@/server/reporting/profit";
import { describe, expect, it } from "vitest";

describe("calculateProfitMetrics", () => {
  it("calculates net revenue, gross profit, contribution margin, and profit ROAS", () => {
    const metrics = calculateProfitMetrics({
      revenue: 500000,
      refunds: 25000,
      discounts: 15000,
      cogs: 180000,
      adSpend: 80000
    });

    expect(metrics.netRevenue).toBe(460000);
    expect(metrics.grossProfit).toBe(280000);
    expect(metrics.contributionMargin).toBe(200000);
    expect(metrics.profitRoas).toBe(3.5);
  });

  it("returns null profit ROAS when ad spend is zero", () => {
    expect(
      calculateProfitMetrics({
        revenue: 100000,
        refunds: 0,
        discounts: 0,
        cogs: 40000,
        adSpend: 0
      }).profitRoas
    ).toBeNull();
  });
});
