import { GoogleSheetsConnector } from "@/server/connectors/googleSheetsConnector";
import { afterEach, describe, expect, it, vi } from "vitest";

const googleSheetsMock = vi.hoisted(() => ({
  valuesGet: vi.fn()
}));

vi.mock("googleapis", () => ({
  google: {
    auth: {
      JWT: vi.fn(function JWT() {})
    },
    sheets: vi.fn(() => ({
      spreadsheets: {
        values: {
          get: googleSheetsMock.valuesGet
        }
      }
    }))
  }
}));

describe("GoogleSheetsConnector", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("filters shared MCC sheets to the mapped Google Ads account", async () => {
    vi.stubEnv("GOOGLE_SHEETS_CLIENT_EMAIL", "service@example.com");
    vi.stubEnv("GOOGLE_SHEETS_PRIVATE_KEY", "private_key");
    googleSheetsMock.valuesGet.mockResolvedValueOnce({
      data: {
        values: [
          [
            "Date",
            "Account ID",
            "Campaign",
            "Impressions",
            "Clicks",
            "Cost",
            "Conversions",
            "Conversion value"
          ],
          [
            "2026-06-01",
            "123-456-7890",
            "Brand",
            "1000",
            "100",
            "2500",
            "10",
            "15000"
          ],
          [
            "2026-06-01",
            "999-888-7777",
            "Other Client",
            "9000",
            "900",
            "45000",
            "90",
            "90000"
          ]
        ]
      }
    });

    const result = await new GoogleSheetsConnector().fetch({
      clientId: "client_1",
      accountMappingId: "mapping_1",
      dateRange: { from: "2026-06-01", to: "2026-06-07" },
      config: {
        spreadsheetId: "sheet_1",
        range: "Google Ads!A:H",
        dateField: "Date",
        accountIdField: "Account ID",
        sourceReference: "google-ads-sheet:sheet_1",
        platform: "google_ads",
        sourceAccountId: "1234567890",
        syncRunId: "sync_1",
        currency: "INR"
      }
    });

    expect(result.rowsImported).toBe(5);
    expect(result.warnings).toEqual([]);
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricName: "spend",
          metricValue: 2500,
          dimensions: expect.objectContaining({ campaign: "Brand" })
        })
      ])
    );
    expect(result.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dimensions: expect.objectContaining({ campaign: "Other Client" })
        })
      ])
    );
  });

  it("imports public CSV Sheet exports and filters by date range", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          [
            [
              "Date",
              "Account ID",
              "Campaign",
              "Impressions",
              "Clicks",
              "Cost",
              "Conversions",
              "Conversion value"
            ].join(","),
            [
              "2026-05-31",
              "123-456-7890",
              "Too Early",
              "1",
              "1",
              "1",
              "1",
              "1"
            ].join(","),
            [
              "2026-06-01",
              "123-456-7890",
              "Brand",
              "1000",
              "100",
              "2500",
              "10",
              "15000"
            ].join(","),
            [
              "2026-06-01",
              "999-888-7777",
              "Other Client",
              "9000",
              "900",
              "45000",
              "90",
              "90000"
            ].join(",")
          ].join("\n"),
          {
            status: 200,
            headers: { "Content-Type": "text/csv" }
          }
        )
      )
    );

    const result = await new GoogleSheetsConnector().fetch({
      clientId: "client_1",
      accountMappingId: "mapping_1",
      dateRange: { from: "2026-06-01", to: "2026-06-07" },
      config: {
        spreadsheetId: "sheet_1",
        range: "Data Extraction Spreadsheet!A:H",
        dateField: "Date",
        accountIdField: "Account ID",
        sourceReference: "google-ads-sheet:sheet_1",
        platform: "google_ads",
        sourceAccountId: "123-456-7890",
        syncRunId: "sync_1",
        currency: "INR",
        publicCsv: "true"
      }
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://docs.google.com/spreadsheets/d/sheet_1/gviz/tq?tqx=out:csv&sheet=Data%20Extraction%20Spreadsheet"
    );
    expect(result.rowsImported).toBe(5);
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricName: "spend",
          metricValue: 2500,
          dimensions: expect.objectContaining({ campaign: "Brand" })
        })
      ])
    );
    expect(result.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dimensions: expect.objectContaining({ campaign: "Too Early" })
        }),
        expect.objectContaining({
          dimensions: expect.objectContaining({ campaign: "Other Client" })
        })
      ])
    );
  });
});
