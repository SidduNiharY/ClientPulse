import { detectAnomalies } from "@/server/reporting/anomalies";
import { describe, expect, it } from "vitest";

describe("detectAnomalies", () => {
  it("flags missing platform data and spend without conversions", () => {
    const anomalies = detectAnomalies({
      missingPlatforms: ["shopify"],
      current: {
        spend: 10000,
        revenue: 0,
        conversions: 0,
        impressions: 1000,
        cpc: 10,
        cpl: null,
        roas: 0
      },
      previous: {
        spend: 5000,
        revenue: 50000,
        conversions: 50,
        impressions: 2000,
        cpc: 5,
        cpl: null,
        roas: 10
      }
    });

    expect(anomalies.map((item) => item.anomalyType)).toContain(
      "missing_platform_data"
    );
    expect(anomalies.map((item) => item.anomalyType)).toContain(
      "zero_conversions"
    );
    expect(anomalies.map((item) => item.anomalyType)).toContain("spend_spike");
    expect(anomalies.map((item) => item.anomalyType)).toContain("revenue_drop");
  });
});
