import type { Connector } from "./types";
import {
  emptyDirectConnectorResult,
  requireConfig,
  type DirectConnectorFetchInput
} from "./directApiHelpers";

export const shopifyDirectAuthorizationError =
  "Shopify direct connector requires store domain and read orders access token";

export class ShopifyApiConnector implements Connector {
  readonly connectorType = "direct_api";

  async fetch(input: DirectConnectorFetchInput) {
    requireConfig({
      config: input.config,
      keys: ["storeDomain", "accessToken"],
      error: shopifyDirectAuthorizationError
    });

    return emptyDirectConnectorResult("Shopify");
  }
}
