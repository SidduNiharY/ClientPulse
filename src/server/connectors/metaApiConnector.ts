import type { Connector } from "./types";
import {
  emptyDirectConnectorResult,
  requireConfig,
  type DirectConnectorFetchInput
} from "./directApiHelpers";

export const metaDirectAuthorizationError =
  "Meta direct connector requires ad account access token with ads read permissions";

export class MetaApiConnector implements Connector {
  readonly connectorType = "direct_api";

  async fetch(input: DirectConnectorFetchInput) {
    requireConfig({
      config: input.config,
      keys: ["accessToken", "adAccountId"],
      error: metaDirectAuthorizationError
    });

    return emptyDirectConnectorResult("Meta");
  }
}
