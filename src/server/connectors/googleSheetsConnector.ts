import { google } from "googleapis";
import { normalizeRows } from "@/server/normalization/normalizeRows";
import type {
  Connector,
  ConnectorResult,
  IngestionMethod,
  Platform
} from "./types";

type SheetRow = Record<string, string | number | null | undefined>;

const connectorType: IngestionMethod = "google_sheets";

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

  throw new Error("Google Sheets connector requires a valid platform");
}

function requireConfig(config: Record<string, string>) {
  if (
    !config.spreadsheetId ||
    !config.range ||
    !config.dateField ||
    !config.sourceReference
  ) {
    throw new Error(
      "Google Sheets connector requires spreadsheetId, range, dateField, and sourceReference"
    );
  }
}

function sheetValuesToRows(values: unknown[][]): SheetRow[] {
  const [headers, ...dataRows] = values;

  if (!headers) {
    return [];
  }

  return dataRows.map((row) =>
    headers.reduce<SheetRow>((record, header, index) => {
      record[String(header)] = row[index] as string | number | null | undefined;
      return record;
    }, {})
  );
}

export class GoogleSheetsConnector implements Connector {
  readonly connectorType = connectorType;

  async fetch(input: {
    clientId: string;
    accountMappingId: string;
    dateRange: { from: string; to: string };
    config: Record<string, string>;
  }): Promise<ConnectorResult> {
    requireConfig(input.config);

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: input.config.spreadsheetId,
      range: input.config.range
    });
    const rows = sheetValuesToRows(response.data.values ?? []);
    const normalizedRows = normalizeRows({
      clientId: input.clientId,
      platform: parsePlatform(input.config.platform),
      ingestionMethod: connectorType,
      sourceAccountId: input.config.sourceAccountId ?? input.accountMappingId,
      syncRunId: input.config.syncRunId ?? input.accountMappingId,
      sourceReference: input.config.sourceReference,
      dateField: input.config.dateField,
      currency: input.config.currency ?? null,
      rows
    });

    return {
      rows: normalizedRows,
      rowsImported: normalizedRows.length,
      warnings: []
    };
  }
}
