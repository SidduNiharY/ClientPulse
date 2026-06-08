import { GA4ApiConnector } from "@/server/connectors/ga4ApiConnector";
import { GoogleAdsApiConnector } from "@/server/connectors/googleAdsApiConnector";
import { MetaApiConnector } from "@/server/connectors/metaApiConnector";
import { ShopifyApiConnector } from "@/server/connectors/shopifyApiConnector";
import { afterEach, describe, expect, it, vi } from "vitest";

const connectorCases = [
  {
    name: "Google Ads",
    connector: new GoogleAdsApiConnector(),
    error:
      "Google Ads direct connector requires developer token, OAuth client, refresh token, and MCC login customer ID"
  },
  {
    name: "Meta",
    connector: new MetaApiConnector(),
    error:
      "Meta direct connector requires ad account access token with ads read permissions"
  },
  {
    name: "GA4",
    connector: new GA4ApiConnector(),
    error:
      "GA4 direct connector requires property access and OAuth or service account credentials"
  },
  {
    name: "Shopify",
    connector: new ShopifyApiConnector(),
    error:
      "Shopify direct connector requires store domain and read orders access token"
  }
];

describe("direct connector contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(connectorCases)(
    "$name connector exposes the shared connector interface",
    ({ connector }) => {
      expect(connector.connectorType).toBe("direct_api");
      expect(connector.fetch).toEqual(expect.any(Function));
    }
  );

  it.each(connectorCases)(
    "$name connector returns a provider-specific authorization error",
    async ({ connector, error }) => {
      await expect(
        connector.fetch({
          clientId: "client_1",
          accountMappingId: "mapping_1",
          dateRange: { from: "2026-06-01", to: "2026-06-07" },
          config: {}
        })
      ).rejects.toThrow(error);
    }
  );

  it("fetches and normalizes Google Ads campaign metrics", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "access_1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              results: [
                {
                  segments: { date: "2026-06-01", device: "DESKTOP" },
                  campaign: { id: "111", name: "Brand Search" },
                  metrics: {
                    impressions: "1000",
                    clicks: "50",
                    costMicros: "25000000",
                    conversions: "4",
                    conversionsValue: "1000"
                  }
                }
              ]
            }
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new GoogleAdsApiConnector().fetch({
      clientId: "client_1",
      accountMappingId: "mapping_1",
      dateRange: { from: "2026-06-01", to: "2026-06-07" },
      config: {
        developerToken: "developer_token",
        oauthClientId: "client_id",
        oauthClientSecret: "client_secret",
        refreshToken: "refresh_token",
        loginCustomerId: "999-888-7777",
        sourceAccountId: "123-456-7890",
        syncRunId: "sync_1"
      }
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://googleads.googleapis.com/v24/customers/1234567890/googleAds:searchStream"
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer access_1",
        "developer-token": "developer_token",
        "login-customer-id": "9998887777"
      })
    });
    expect(result.rowsImported).toBe(5);
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricName: "spend",
          metricValue: 25,
          sourceAccountId: "1234567890"
        }),
        expect.objectContaining({
          metricName: "conversion_value",
          metricValue: 1000
        })
      ])
    );
  });
});
