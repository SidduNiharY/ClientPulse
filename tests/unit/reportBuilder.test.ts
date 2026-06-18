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
  occurredOn?: string;
  importedAt?: string;
  dimensions?: Record<string, string>;
}): NormalizedMetricRow {
  const occurredOn = input.occurredOn ?? "2026-06-01";

  return {
    clientId: "client_1",
    platform: input.platform,
    ingestionMethod: "csv_upload",
    sourceAccountId:
      input.platform === "google_ads" ? "123-456-7890" : "source_1",
    metricName: input.metricName,
    metricValue: input.metricValue,
    currency: "INR",
    occurredOn,
    dimensions: input.dimensions ?? { campaign: "Brand" },
    sourceTrace: {
      platform: input.platform,
      connectorType: "csv_upload",
      sourceAccountId:
        input.platform === "google_ads" ? "123-456-7890" : "source_1",
      originalFieldName: input.originalFieldName,
      sourceReference: input.sourceReference,
      syncRunId: "sync_1",
      dateRange: { from: occurredOn, to: occurredOn },
      importedAt: input.importedAt ?? "2026-06-04T00:00:00.000Z"
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

  it("caps detailed source trace snapshots while keeping the total count", () => {
    const rows = Array.from({ length: 300 }, (_, index) =>
      metricRow({
        platform: "google_ads",
        metricName: "spend",
        metricValue: index + 1,
        originalFieldName: `Cost ${index}`,
        sourceReference: `google-ads-row-${index}.csv`
      })
    );
    const draft = buildReportDraftSnapshot({
      request,
      clientName: "Demo Ecommerce Client",
      metricRows: rows
    });

    expect(draft.sourceTrace).toHaveLength(250);
    expect(draft.sourceTraceTotalCount).toBe(300);
    expect(draft.sourceTraceTruncated).toBe(true);
  });

  it("builds previous-period comparison metrics for anomaly detection", () => {
    const currentRows = [
      metricRow({
        platform: "google_ads",
        metricName: "spend",
        metricValue: 10000,
        originalFieldName: "Cost",
        sourceReference: "google-ads-current.csv"
      }),
      metricRow({
        platform: "google_ads",
        metricName: "impressions",
        metricValue: 10000,
        originalFieldName: "Impressions",
        sourceReference: "google-ads-current.csv"
      }),
      metricRow({
        platform: "google_ads",
        metricName: "clicks",
        metricValue: 100,
        originalFieldName: "Clicks",
        sourceReference: "google-ads-current.csv"
      }),
      metricRow({
        platform: "google_ads",
        metricName: "conversions",
        metricValue: 10,
        originalFieldName: "Conversions",
        sourceReference: "google-ads-current.csv"
      }),
      metricRow({
        platform: "shopify",
        metricName: "revenue",
        metricValue: 40000,
        originalFieldName: "total_revenue",
        sourceReference: "shopify-current.csv"
      })
    ];
    const previousRows = [
      metricRow({
        platform: "google_ads",
        metricName: "spend",
        metricValue: 8000,
        originalFieldName: "Cost",
        sourceReference: "google-ads-previous.csv",
        occurredOn: "2026-05-25"
      }),
      metricRow({
        platform: "google_ads",
        metricName: "impressions",
        metricValue: 12000,
        originalFieldName: "Impressions",
        sourceReference: "google-ads-previous.csv",
        occurredOn: "2026-05-25"
      }),
      metricRow({
        platform: "google_ads",
        metricName: "clicks",
        metricValue: 200,
        originalFieldName: "Clicks",
        sourceReference: "google-ads-previous.csv",
        occurredOn: "2026-05-25"
      }),
      metricRow({
        platform: "google_ads",
        metricName: "conversions",
        metricValue: 40,
        originalFieldName: "Conversions",
        sourceReference: "google-ads-previous.csv",
        occurredOn: "2026-05-25"
      }),
      metricRow({
        platform: "shopify",
        metricName: "revenue",
        metricValue: 60000,
        originalFieldName: "total_revenue",
        sourceReference: "shopify-previous.csv",
        occurredOn: "2026-05-25"
      })
    ];

    const draft = buildReportDraftSnapshot({
      request,
      clientName: "Demo Ecommerce Client",
      metricRows: currentRows,
      previousMetricRows: previousRows
    });

    expect(draft.previousPeriodComparison).toMatchObject({
      dateRange: { from: "2026-05-25", to: "2026-05-31" },
      selectedRevenue: 60000,
      adTotals: expect.objectContaining({
        spend: 8000,
        conversions: 40
      })
    });
    expect(draft.previousPeriodComparison?.deltas.revenue).toMatchObject({
      absoluteChange: -20000,
      percentChange: expect.closeTo(-0.3333333333, 5),
      direction: "down"
    });
    expect(draft.anomalies.map((item) => item.anomalyType)).toEqual(
      expect.arrayContaining(["revenue_drop", "conversion_drop", "cpc_spike"])
    );
  });

  it("adds blended ROAS, MER, and paid platform split to the snapshot", () => {
    const draft = buildReportDraftSnapshot({
      request,
      clientName: "Demo Ecommerce Client",
      metricRows: [
        metricRow({
          platform: "google_ads",
          metricName: "spend",
          metricValue: 25000,
          originalFieldName: "Cost",
          sourceReference: "google-ads-week.csv"
        }),
        metricRow({
          platform: "google_ads",
          metricName: "conversion_value",
          metricValue: 100000,
          originalFieldName: "Conv. value",
          sourceReference: "google-ads-week.csv"
        }),
        metricRow({
          platform: "meta_ads",
          metricName: "spend",
          metricValue: 15000,
          originalFieldName: "Amount spent",
          sourceReference: "meta-week.csv"
        }),
        metricRow({
          platform: "meta_ads",
          metricName: "conversion_value",
          metricValue: 30000,
          originalFieldName: "Purchase conversion value",
          sourceReference: "meta-week.csv"
        }),
        metricRow({
          platform: "shopify",
          metricName: "revenue",
          metricValue: 160000,
          originalFieldName: "total_revenue",
          sourceReference: "shopify-week.csv"
        })
      ]
    });

    expect(draft.derivedMetrics.roas).toBe(6.4);
    expect(draft.blendedMetrics).toMatchObject({
      roas: 4,
      mer: 4,
      totalMarketingSpend: 40000,
      selectedRevenue: 160000
    });
    expect(draft.platformSplit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: "google_ads",
          spend: 25000,
          conversionValue: 100000,
          spendShare: 0.625,
          platformRoas: 4
        }),
        expect.objectContaining({
          platform: "meta_ads",
          spend: 15000,
          conversionValue: 30000,
          spendShare: 0.375,
          platformRoas: 2
        })
      ])
    );
  });

  it("adds goal, pacing, and source-health summaries", () => {
    const draft = buildReportDraftSnapshot({
      request: { ...request, adSource: "google_ads_meta_ads" },
      clientName: "Demo Ecommerce Client",
      metricRows: [
        metricRow({
          platform: "google_ads",
          metricName: "spend",
          metricValue: 25000,
          originalFieldName: "Cost",
          sourceReference: "google-ads-week.csv",
          importedAt: "2026-06-04T00:00:00.000Z"
        }),
        metricRow({
          platform: "google_ads",
          metricName: "impressions",
          metricValue: 100000,
          originalFieldName: "Impressions",
          sourceReference: "google-ads-week.csv",
          importedAt: "2026-06-04T00:00:00.000Z"
        }),
        metricRow({
          platform: "shopify",
          metricName: "revenue",
          metricValue: 100000,
          originalFieldName: "total_revenue",
          sourceReference: "shopify-week.csv",
          importedAt: "2026-06-04T00:00:00.000Z"
        })
      ],
      goals: [{ goalType: "roas", targetValue: 3 }],
      budgets: [{ monthlyBudget: 300000 }],
      generatedAt: "2026-06-10T00:00:00.000Z"
    });

    expect(draft.goalPerformance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          goalType: "roas",
          targetValue: 3,
          actualValue: 4,
          status: "met",
          summary: expect.stringContaining("ROAS met target")
        })
      ])
    );
    expect(draft.budgetPacing).toEqual(
      expect.objectContaining({
        status: "behind",
        summary: expect.stringContaining("behind pace")
      })
    );
    expect(draft.connectorHealthWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          warningType: "missing_platform",
          platform: "meta_ads"
        }),
        expect.objectContaining({
          warningType: "stale_data",
          platform: "google_ads"
        })
      ])
    );
  });
});
