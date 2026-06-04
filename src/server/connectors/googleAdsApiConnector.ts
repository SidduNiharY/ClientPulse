import type { Connector } from "./types";
import {
  emptyDirectConnectorResult,
  requireConfig,
  type DirectConnectorFetchInput
} from "./directApiHelpers";

export const googleAdsDirectAuthorizationError =
  "Google Ads direct connector requires developer token, OAuth client, refresh token, and MCC login customer ID";

export class GoogleAdsApiConnector implements Connector {
  readonly connectorType = "direct_api";

  async fetch(input: DirectConnectorFetchInput) {
    requireConfig({
      config: input.config,
      keys: [
        "developerToken",
        "oauthClientId",
        "oauthClientSecret",
        "refreshToken",
        "loginCustomerId"
      ],
      error: googleAdsDirectAuthorizationError
    });

    return emptyDirectConnectorResult("Google Ads");
  }
}
