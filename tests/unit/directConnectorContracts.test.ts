import { GA4ApiConnector } from "@/server/connectors/ga4ApiConnector";
import { GoogleAdsApiConnector } from "@/server/connectors/googleAdsApiConnector";
import { MetaApiConnector } from "@/server/connectors/metaApiConnector";
import { ShopifyApiConnector } from "@/server/connectors/shopifyApiConnector";
import { describe, expect, it } from "vitest";

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
});
