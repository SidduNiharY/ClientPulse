import { describe, expect, it } from "vitest";
import {
  buildDailyTrend,
  effectiveRevenue,
  recentWindow
} from "@/lib/dashboardMetrics";

describe("effectiveRevenue", () => {
  it("uses revenue when it is positive", () => {
    expect(effectiveRevenue({ revenue: 100, conversionValue: 50 })).toBe(100);
  });

  it("falls back to conversion value when revenue is zero", () => {
    expect(effectiveRevenue({ revenue: 0, conversionValue: 50 })).toBe(50);
  });

  it("falls back to conversion value when revenue is negative", () => {
    expect(effectiveRevenue({ revenue: -5, conversionValue: 42 })).toBe(42);
  });

  it("returns zero when neither source has value", () => {
    expect(effectiveRevenue({ revenue: 0, conversionValue: 0 })).toBe(0);
  });
});

describe("recentWindow", () => {
  it("returns an inclusive window of N calendar days ending on the latest date", () => {
    const latest = new Date("2026-06-15T12:00:00.000Z");
    const window = recentWindow(latest, 30);

    expect(window.to.toISOString()).toBe("2026-06-15T12:00:00.000Z");
    expect(window.from.toISOString()).toBe("2026-05-17T00:00:00.000Z");
  });

  it("clamps the window to at least one day", () => {
    const latest = new Date("2026-06-15T08:30:00.000Z");
    const window = recentWindow(latest, 1);

    expect(window.from.toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });
});

describe("buildDailyTrend", () => {
  it("groups rows by date and uses effective revenue per day", () => {
    const rows = [
      { date: "2026-06-01", metricName: "spend", value: 100 },
      { date: "2026-06-01", metricName: "conversion_value", value: 400 },
      { date: "2026-06-02", metricName: "spend", value: 120 },
      { date: "2026-06-02", metricName: "revenue", value: 600 },
      { date: "2026-06-02", metricName: "conversion_value", value: 500 }
    ];

    expect(buildDailyTrend(rows)).toEqual([
      { date: "2026-06-01", spend: 100, revenue: 400 },
      { date: "2026-06-02", spend: 120, revenue: 600 }
    ]);
  });

  it("sorts points by date ascending", () => {
    const rows = [
      { date: "2026-06-03", metricName: "spend", value: 10 },
      { date: "2026-06-01", metricName: "spend", value: 5 }
    ];

    expect(buildDailyTrend(rows).map((point) => point.date)).toEqual([
      "2026-06-01",
      "2026-06-03"
    ]);
  });

  it("returns an empty array for no rows", () => {
    expect(buildDailyTrend([])).toEqual([]);
  });
});
