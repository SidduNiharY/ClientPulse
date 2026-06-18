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

  it("flags previous-period conversion drops and cost spikes", () => {
    const anomalies = detectAnomalies({
      missingPlatforms: [],
      current: {
        spend: 10000,
        revenue: 40000,
        conversions: 20,
        impressions: 10000,
        cpc: 25,
        cpl: null,
        roas: 4
      },
      previous: {
        spend: 8000,
        revenue: 50000,
        conversions: 40,
        impressions: 12000,
        cpc: 10,
        cpl: null,
        roas: 6.25
      }
    });

    expect(anomalies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          anomalyType: "conversion_drop",
          severity: "warning",
          clientSafe: true
        }),
        expect.objectContaining({
          anomalyType: "cpc_spike",
          severity: "warning",
          clientSafe: true
        })
      ])
    );
  });
});
