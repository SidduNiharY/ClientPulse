import { google } from "googleapis";
import Papa from "papaparse";
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

function normalizeAccountId(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("-", "")
    .trim();
}

function filterRowsBySourceAccount(input: {
  rows: SheetRow[];
  config: Record<string, string>;
}) {
  const accountIdField = input.config.accountIdField;

  if (!accountIdField) {
    return input.rows;
  }

  const sourceAccountId = normalizeAccountId(input.config.sourceAccountId);

  if (!sourceAccountId) {
    return input.rows;
  }

  return input.rows.filter(
    (row) => normalizeAccountId(row[accountIdField]) === sourceAccountId
  );
}

function filterRowsByDateRange(input: {
  rows: SheetRow[];
  dateField: string;
  dateRange: { from: string; to: string };
}) {
  return input.rows.filter((row) => {
    const occurredOn = String(row[input.dateField] ?? "");

    return occurredOn >= input.dateRange.from && occurredOn <= input.dateRange.to;
  });
}

function shouldUsePublicCsv(config: Record<string, string>) {
  return (
    config.publicCsv === "true" ||
    !process.env.GOOGLE_SHEETS_CLIENT_EMAIL ||
    !process.env.GOOGLE_SHEETS_PRIVATE_KEY
  );
}

function sheetNameFromRange(range: string) {
  return range.split("!")[0]?.replace(/^'|'$/g, "") || range;
}

async function fetchPublicCsvRows(config: Record<string, string>) {
  const sheetName = sheetNameFromRange(config.range);
  const url =
    `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}` +
    `/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Public Google Sheet CSV export failed with ${response.status}`
    );
  }

  const csv = await response.text();
  const parsed = Papa.parse<SheetRow>(csv, {
    header: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    throw new Error(
      `Public Google Sheet CSV parse failed: ${parsed.errors[0].message}`
    );
  }

  return parsed.data;
}

async function fetchSheetsApiRows(config: Record<string, string>) {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: config.range
  });

  return sheetValuesToRows(response.data.values ?? []);
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

    const rows = shouldUsePublicCsv(input.config)
      ? await fetchPublicCsvRows(input.config)
      : await fetchSheetsApiRows(input.config);
    const accountRows = filterRowsBySourceAccount({
      rows,
      config: input.config
    });
    const filteredRows = filterRowsByDateRange({
      rows: accountRows,
      dateField: input.config.dateField,
      dateRange: input.dateRange
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
      rows: filteredRows
    });

    return {
      rows: normalizedRows,
      rowsImported: normalizedRows.length,
      warnings:
        input.config.accountIdField && rows.length > 0 && accountRows.length === 0
          ? [
              `No Google Sheets rows matched ${input.config.accountIdField}=${input.config.sourceAccountId}`
            ]
          : []
    };
  }
}
