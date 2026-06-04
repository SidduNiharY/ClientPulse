import type { NormalizedMetricRow } from "@/server/connectors/types";
import {
  buildReportDraftSnapshot,
  type ReportBuildRequest
} from "@/server/reporting/reportBuilder";
import { getMonthlyRange, getWeeklyRange } from "@/server/reporting/dateRanges";
import { describe, expect, it } from "vitest";

const request: ReportBuildRequest = {
  clientId: "client_1",
  reportType: "weekly",
  dateRange: { from: "2026-06-01", to: "2026-06-07" },
  adSource: "google_ads",
  revenueSource: "shopify",
  generatedByUserId: "user_1"
};

function metricRow(input: {
  platform: NormalizedMetricRow["platform"];
  metricName: NormalizedMetricRow["metricName"];
  metricValue: number;
  originalFieldName: string;
  sourceReference: string;
}): NormalizedMetricRow {
  return {
    clientId: "client_1",
    platform: input.platform,
    ingestionMethod: "csv_upload",
    sourceAccountId:
      input.platform === "google_ads" ? "123-456-7890" : "source_1",
    metricName: input.metricName,
    metricValue: input.metricValue,
    currency: "INR",
    occurredOn: "2026-06-01",
    dimensions: { campaign: "Brand" },
    sourceTrace: {
      platform: input.platform,
      connectorType: "csv_upload",
      sourceAccountId:
        input.platform === "google_ads" ? "123-456-7890" : "source_1",
      originalFieldName: input.originalFieldName,
      sourceReference: input.sourceReference,
      syncRunId: "sync_1",
      dateRange: { from: "2026-06-01", to: "2026-06-01" },
      importedAt: "2026-06-04T00:00:00.000Z"
    }
  };
}

const metricRows = [
  metricRow({
    platform: "google_ads",
    metricName: "spend",
    metricValue: 25000,
    originalFieldName: "Cost",
    sourceReference: "google-ads-week.csv"
  }),
  metricRow({
    platform: "google_ads",
    metricName: "impressions",
    metricValue: 100000,
    originalFieldName: "Impressions",
    sourceReference: "google-ads-week.csv"
  }),
  metricRow({
    platform: "google_ads",
    metricName: "clicks",
    metricValue: 5000,
    originalFieldName: "Clicks",
    sourceReference: "google-ads-week.csv"
  }),
  metricRow({
    platform: "shopify",
    metricName: "revenue",
    metricValue: 100000,
    originalFieldName: "total_revenue",
    sourceReference: "shopify-week.csv"
  }),
  metricRow({
    platform: "ga4",
    metricName: "revenue",
    metricValue: 50000,
    originalFieldName: "purchaseRevenue",
    sourceReference: "ga4-week.csv"
  })
];

describe("report builder", () => {
  it("returns weekly and monthly date ranges", () => {
    expect(getMonthlyRange("2026-06-15")).toEqual({
      from: "2026-06-01",
      to: "2026-06-30"
    });
    expect(getWeeklyRange("2026-06-04")).toEqual({
      from: "2026-06-01",
      to: "2026-06-07"
    });
  });

  it("uses Shopify revenue for selected revenue ROAS", () => {
    const draft = buildReportDraftSnapshot({
      request,
      clientName: "Demo Ecommerce Client",
      metricRows
    });

    expect(draft.derivedMetrics.roas).toBe(4);
    expect(draft.status).toBe("needs_review");
  });

  it("uses GA4 revenue for selected revenue ROAS", () => {
    const draft = buildReportDraftSnapshot({
      request: { ...request, revenueSource: "ga4" },
      clientName: "Demo Ecommerce Client",
      metricRows
    });

    expect(draft.derivedMetrics.roas).toBe(2);
  });

  it("preserves source trace fields used for report auditability", () => {
    const draft = buildReportDraftSnapshot({
      request,
      clientName: "Demo Ecommerce Client",
      metricRows
    });
    const trace = draft.sourceTrace.find(
      (item) => item.originalFieldName === "Cost"
    );

    expect(trace).toMatchObject({
      platform: "google_ads",
      connectorType: "csv_upload",
      sourceAccountId: "123-456-7890",
      originalFieldName: "Cost",
      syncRunId: "sync_1",
      sourceReference: "google-ads-week.csv"
    });
  });
});
