import type { NormalizedMetricRow } from "@/server/connectors/types";
import {
  runMetricAnalysisAgent,
  runReportEnrichmentAgents
} from "@/server/reporting/reportAgents";
import {
  buildReportDraftSnapshot,
  type ReportBuildRequest
} from "@/server/reporting/reportBuilder";
import { afterEach, describe, expect, it, vi } from "vitest";

const request: ReportBuildRequest = {
  clientId: "client_1",
  reportType: "weekly",
  dateRange: { from: "2026-06-01", to: "2026-06-07" },
  adSource: "google_ads_meta_ads",
  revenueSource: "shopify",
  generatedByUserId: "user_1"
};

function metricRow(input: {
  platform: NormalizedMetricRow["platform"];
  metricName: NormalizedMetricRow["metricName"];
  metricValue: number;
  occurredOn?: string;
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
    dimensions: input.dimensions ?? { campaign: "Brand Search" },
    sourceTrace: {
      platform: input.platform,
      connectorType: "csv_upload",
      sourceAccountId:
        input.platform === "google_ads" ? "123-456-7890" : "source_1",
      originalFieldName: input.metricName,
      sourceReference: `${input.platform}.csv`,
      syncRunId: "sync_1",
      dateRange: { from: occurredOn, to: occurredOn },
      importedAt: "2026-06-08T00:00:00.000Z"
    }
  };
}

function buildSnapshot() {
  return buildReportDraftSnapshot({
    request,
    clientName: "Demo Ecommerce Client",
    metricRows: [
      metricRow({ platform: "google_ads", metricName: "spend", metricValue: 25000 }),
      metricRow({
        platform: "google_ads",
        metricName: "conversion_value",
        metricValue: 100000
      }),
      metricRow({ platform: "google_ads", metricName: "clicks", metricValue: 5000 }),
      metricRow({
        platform: "google_ads",
        metricName: "conversions",
        metricValue: 200
      }),
      metricRow({
        platform: "shopify",
        metricName: "revenue",
        metricValue: 120000
      })
    ],
    previousMetricRows: [
      metricRow({
        platform: "google_ads",
        metricName: "spend",
        metricValue: 20000,
        occurredOn: "2026-05-25"
      }),
      metricRow({
        platform: "shopify",
        metricName: "revenue",
        metricValue: 90000,
        occurredOn: "2026-05-25"
      })
    ],
    budgets: [{ monthlyBudget: 300000 }],
    generatedAt: "2026-06-08T00:00:00.000Z"
  });
}

describe("report enrichment agents", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates numeric findings from report performance data", () => {
    const findings = runMetricAnalysisAgent(buildSnapshot());

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Revenue efficiency",
          sourceMetric: "roas",
          detail: expect.stringContaining("ROAS")
        }),
        expect.objectContaining({
          title: "Period movement",
          sourceMetric: "period_comparison"
        }),
        expect.objectContaining({
          title: "Budget pacing",
          sourceMetric: "budget_pacing"
        })
      ])
    );
  });

  it("adds sourced domain trend items with a bounded live-news query", async () => {
    vi.stubEnv("REPORT_DOMAIN_TRENDS_ENABLED", "true");
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          articles: [
            {
              title: "Retailers increase first-party data investment",
              url: "https://example.com/retail-data",
              domain: "example.com",
              seendate: "20260615120000"
            }
          ]
        }),
        { status: 200 }
      )
    );

    const narratives = await runReportEnrichmentAgents({
      snapshot: buildSnapshot(),
      clientType: "ecommerce",
      now: new Date("2026-06-16T00:00:00.000Z"),
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const requestedUrl = fetchImpl.mock.calls[0]?.[0];

    if (!(requestedUrl instanceof URL)) {
      throw new Error("Expected domain trend lookup to request a URL");
    }

    expect(requestedUrl.searchParams.get("query")).toContain("ecommerce");
    expect(narratives.domainTrends.items).toEqual([
      expect.objectContaining({
        title: "Retailers increase first-party data investment",
        sourceName: "example.com",
        url: "https://example.com/retail-data",
        publishedAt: "2026-06-15T00:00:00.000Z"
      })
    ]);
  });
});
