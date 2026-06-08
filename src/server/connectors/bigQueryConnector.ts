import { BigQuery } from "@google-cloud/bigquery";
import { normalizeRows } from "@/server/normalization/normalizeRows";
import type {
  Connector,
  ConnectorResult,
  IngestionMethod,
  Platform
} from "./types";

type BigQueryRow = Record<string, string | number | null | undefined>;

const connectorType: IngestionMethod = "bigquery";

function parsePlatform(value: string | undefined): Platform {
  if (
    value === "google_ads" ||
    value === "meta_ads" ||
    value === "ga4" ||
    value === "shopify" ||
    value === "manual"
  ) {
    return value;
  }

  throw new Error("BigQuery connector requires a valid platform");
}

function requireConfig(config: Record<string, string>) {
  const projectId = config.projectId ?? process.env.BIGQUERY_PROJECT_ID;

  if (!projectId || !config.query || !config.dateField || !config.sourceReference) {
    throw new Error(
      "BigQuery connector requires projectId, query, dateField, and sourceReference"
    );
  }
}

export class BigQueryConnector implements Connector {
  readonly connectorType = connectorType;

  async fetch(input: {
    clientId: string;
    accountMappingId: string;
    dateRange: { from: string; to: string };
    config: Record<string, string>;
  }): Promise<ConnectorResult> {
    requireConfig(input.config);

    const bigQuery = new BigQuery({
      projectId: input.config.projectId ?? process.env.BIGQUERY_PROJECT_ID,
      credentials: {
        client_email: process.env.BIGQUERY_CLIENT_EMAIL,
        private_key: process.env.BIGQUERY_PRIVATE_KEY?.replace(/\\n/g, "\n")
      }
    });
    const [rows] = await bigQuery.query({
      query: input.config.query,
      params: {
        dateFrom: input.dateRange.from,
        dateTo: input.dateRange.to
      }
    });
    const normalizedRows = normalizeRows({
      clientId: input.clientId,
      platform: parsePlatform(input.config.platform),
      ingestionMethod: connectorType,
      sourceAccountId: input.config.sourceAccountId ?? input.accountMappingId,
      syncRunId: input.config.syncRunId ?? input.accountMappingId,
      sourceReference: input.config.sourceReference,
      dateField: input.config.dateField,
      currency: input.config.currency ?? null,
      rows: rows as BigQueryRow[]
    });

    return {
      rows: normalizedRows,
      rowsImported: normalizedRows.length,
      warnings: []
    };
  }
}
