import Papa from "papaparse";
import { normalizeRows } from "@/server/normalization/normalizeRows";
import type {
  Connector,
  ConnectorResult,
  IngestionMethod,
  Platform
} from "./types";

type ParsedCsvRow = Record<string, string | number | null | undefined>;

const connectorType: IngestionMethod = "csv_upload";

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

  throw new Error("CSV import requires a valid platform");
}

function parseIngestionMethod(value: string | undefined): IngestionMethod {
  return value === "platform_script" ? "platform_script" : connectorType;
}

export class CsvConnector implements Connector {
  readonly connectorType = connectorType;

  async fetch(input: {
    clientId: string;
    accountMappingId: string;
    dateRange: { from: string; to: string };
    config: Record<string, string>;
  }): Promise<ConnectorResult> {
    const parseResult = Papa.parse<ParsedCsvRow>(input.config.csv ?? "", {
      header: true,
      skipEmptyLines: true
    });
    const rows = parseResult.data.filter((row) => Object.keys(row).length > 0);

    if (rows.length === 0) {
      return {
        rows: [],
        rowsImported: 0,
        warnings: ["CSV file contained no rows"]
      };
    }

    const dateField = input.config.dateField;

    if (!dateField || !Object.prototype.hasOwnProperty.call(rows[0], dateField)) {
      throw new Error("CSV import requires a date field");
    }

    const normalizedRows = normalizeRows({
      clientId: input.clientId,
      platform: parsePlatform(input.config.platform),
      ingestionMethod: parseIngestionMethod(input.config.ingestionMethod),
      sourceAccountId: input.config.sourceAccountId ?? input.accountMappingId,
      syncRunId: input.config.syncRunId ?? input.accountMappingId,
      sourceReference: input.config.sourceReference ?? "uploaded.csv",
      dateField,
      currency: input.config.currency ?? null,
      rows
    });

    return {
      rows: normalizedRows,
      rowsImported: normalizedRows.length,
      warnings: parseResult.errors.map((error) => error.message)
    };
  }
}
