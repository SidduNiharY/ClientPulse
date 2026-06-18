import { render, screen, within } from "@testing-library/react";
import {
  buildPlatformPerformanceDashboard,
  PlatformPerformanceDashboard,
  type PlatformMetricInput
} from "@/components/PlatformPerformanceDashboard";
import { describe, expect, it } from "vitest";

const metricRows: PlatformMetricInput[] = [
  { platform: "google_ads", metricName: "spend", metricValue: 9000 },
  { platform: "google_ads", metricName: "impressions", metricValue: 50000 },
  { platform: "google_ads", metricName: "clicks", metricValue: 2800 },
  { platform: "google_ads", metricName: "conversions", metricValue: 155 },
  { platform: "google_ads", metricName: "leads", metricValue: 22 },
  {
    platform: "google_ads",
    metricName: "conversion_value",
    metricValue: 72000
  },
  { platform: "meta_ads", metricName: "spend", metricValue: 16000 },
  { platform: "meta_ads", metricName: "impressions", metricValue: 100000 },
  { platform: "meta_ads", metricName: "clicks", metricValue: 4200 },
  { platform: "meta_ads", metricName: "conversions", metricValue: 165 },
  { platform: "meta_ads", metricName: "leads", metricValue: 58 },
  { platform: "meta_ads", metricName: "conversion_value", metricValue: 48000 }
];

describe("platform performance dashboard", () => {
  it("builds Google Ads and Meta metrics from normalized metric rows", () => {
    const dashboard = buildPlatformPerformanceDashboard({
      metricRows,
      selectedRevenue: 140000
    });

    expect(dashboard.blendedRoas).toBeCloseTo(5.6);
    expect(dashboard.rows).toEqual([
      expect.objectContaining({
        platform: "google_ads",
        spend: 9000,
        impressions: 50000,
        clicks: 2800,
        ctr: 0.056,
        cpc: 9000 / 2800,
        conversions: 155,
        leads: 22,
        cpl: 9000 / 22,
        conversionValue: 72000,
        platformRoas: 8
      }),
      expect.objectContaining({
        platform: "meta_ads",
        spend: 16000,
        impressions: 100000,
        clicks: 4200,
        ctr: 0.042,
        cpc: 16000 / 4200,
        conversions: 165,
        leads: 58,
        cpl: 16000 / 58,
        conversionValue: 48000,
        platformRoas: 3
      })
    ]);
  });

  it("flags when at least one platform has lead data", () => {
    const dashboard = buildPlatformPerformanceDashboard({
      metricRows,
      selectedRevenue: 140000
    });

    expect(dashboard.hasLeads).toBe(true);
  });

  it("flags when no platform has lead data", () => {
    const dashboard = buildPlatformPerformanceDashboard({
      metricRows: metricRows.filter((row) => row.metricName !== "leads"),
      selectedRevenue: 140000
    });

    expect(dashboard.hasLeads).toBe(false);
  });

  it("hides the Leads and CPL columns when no platform reports leads", () => {
    render(
      <PlatformPerformanceDashboard
        currency="INR"
        metricRows={metricRows.filter((row) => row.metricName !== "leads")}
        selectedRevenue={140000}
      />
    );

    expect(screen.queryByRole("columnheader", { name: "Leads" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "CPL" })).toBeNull();
    expect(
      screen.getByRole("columnheader", { name: "Conversions" })
    ).toBeInTheDocument();
  });

  it("renders the requested Google Ads and Meta dashboard metrics", () => {
    render(
      <PlatformPerformanceDashboard
        currency="INR"
        metricRows={metricRows}
        selectedRevenue={140000}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Google Ads + Meta performance" })
    ).toBeInTheDocument();
    expect(screen.getByText("Blended ROAS")).toBeInTheDocument();
    expect(screen.getByText("5.60x")).toBeInTheDocument();

    const googleRow = screen.getByRole("row", { name: /Google Ads/ });
    expect(within(googleRow).getByText("INR 9,000")).toBeInTheDocument();
    expect(within(googleRow).getByText("50,000")).toBeInTheDocument();
    expect(within(googleRow).getByText("5.60%")).toBeInTheDocument();
    expect(within(googleRow).getByText("INR 409.09")).toBeInTheDocument();
    expect(within(googleRow).getByText("8.00x")).toBeInTheDocument();

    const metaRow = screen.getByRole("row", { name: /Meta Ads/ });
    expect(within(metaRow).getByText("INR 16,000")).toBeInTheDocument();
    expect(within(metaRow).getByText("100,000")).toBeInTheDocument();
    expect(within(metaRow).getByText("4.20%")).toBeInTheDocument();
    expect(within(metaRow).getByText("INR 275.86")).toBeInTheDocument();
    expect(within(metaRow).getByText("3.00x")).toBeInTheDocument();
  });
});
