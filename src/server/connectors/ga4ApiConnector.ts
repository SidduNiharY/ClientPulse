import type { Connector } from "./types";
import {
  emptyDirectConnectorResult,
  type DirectConnectorFetchInput
} from "./directApiHelpers";

export const ga4DirectAuthorizationError =
  "GA4 direct connector requires property access and OAuth or service account credentials";

export class GA4ApiConnector implements Connector {
  readonly connectorType = "direct_api";

  async fetch(input: DirectConnectorFetchInput) {
    const hasOAuth =
      input.config.propertyId &&
      input.config.oauthClientId &&
      input.config.refreshToken;
    const hasServiceAccount =
      input.config.propertyId &&
      input.config.clientEmail &&
      input.config.privateKey;

    if (!hasOAuth && !hasServiceAccount) {
      throw new Error(ga4DirectAuthorizationError);
    }

    return emptyDirectConnectorResult("GA4");
  }
}
