import type { ConnectorResult, DateRange } from "./types";

export type DirectConnectorFetchInput = {
  clientId: string;
  accountMappingId: string;
  dateRange: DateRange;
  config: Record<string, string>;
};

export function requireConfig(input: {
  config: Record<string, string>;
  keys: string[];
  error: string;
}) {
  const missingKey = input.keys.find((key) => !input.config[key]);

  if (missingKey) {
    throw new Error(input.error);
  }
}

export function emptyDirectConnectorResult(provider: string): ConnectorResult {
  return {
    rows: [],
    rowsImported: 0,
    warnings: [
      `${provider} direct connector is authorized, but live API fetching is not configured for this environment.`
    ]
  };
}
