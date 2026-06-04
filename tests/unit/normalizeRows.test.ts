import { normalizeRows } from "@/server/normalization/normalizeRows";
import { describe, expect, it } from "vitest";

describe("normalizeRows", () => {
  it("normalizes Google Ads spend and preserves source traceability", () => {
    const rows = normalizeRows({
      clientId: "client_1",
      platform: "google_ads",
      ingestionMethod: "csv_upload",
      sourceAccountId: "123-456-7890",
      syncRunId: "sync_1",
      sourceReference: "google-ads-week.csv",
      dateField: "Date",
      currency: "INR",
      rows: [
        {
          Date: "2026-06-01",
          Campaign: "Brand",
          Impressions: "1000",
          Clicks: "100",
          Cost: "2500",
          Conversions: "10",
          "Conversion value": "15000"
        }
      ]
    });

    const spend = rows.find((row) => row.metricName === "spend");

    expect(spend?.metricValue).toBe(2500);
    expect(spend?.sourceTrace.originalFieldName).toBe("Cost");
    expect(spend?.sourceTrace.sourceReference).toBe("google-ads-week.csv");
  });
});
