#!/usr/bin/env node

const required = ["REPORTS_BASE_URL", "GOOGLE_ADS_SHEET_ID"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const baseUrl = process.env.REPORTS_BASE_URL.replace(/\/$/, "");
const spreadsheetId = process.env.GOOGLE_ADS_SHEET_ID;
const dateFrom = process.env.REPORTS_DATE_FROM ?? getIsoDateDaysAgo(7);
const dateTo = process.env.REPORTS_DATE_TO ?? getIsoDateDaysAgo(1);
const importMode = process.env.REPORTS_IMPORT_MODE ?? "replace";
const sheetRange =
  process.env.GOOGLE_ADS_SHEET_RANGE ?? "Data Extraction Spreadsheet!A:Q";
const accountIdField = process.env.GOOGLE_ADS_ACCOUNT_ID_FIELD ?? "Account ID";
const sourceReference =
  process.env.GOOGLE_ADS_SOURCE_REFERENCE ?? "google-ads-mcc-sheet";

const clients = await fetchJson(`${baseUrl}/api/clients`);
let importedMappings = 0;
let importedRows = 0;

for (const client of clients) {
  const mappings = await fetchJson(`${baseUrl}/api/clients/${client.id}/mappings`);
  const googleSheetMappings = mappings.filter(
    (mapping) =>
      mapping.platform === "google_ads" &&
      mapping.ingestionMethod === "google_sheets"
  );

  for (const mapping of googleSheetMappings) {
    const result = await postJson(`${baseUrl}/api/imports`, {
      clientId: client.id,
      accountMappingId: mapping.id,
      importMode,
      dateRange: {
        from: dateFrom,
        to: dateTo
      },
      connectorConfig: {
        spreadsheetId,
        range: sheetRange,
        dateField: process.env.GOOGLE_ADS_DATE_FIELD ?? "Date",
        accountIdField,
        publicCsv: process.env.GOOGLE_ADS_PUBLIC_CSV ?? "true",
        sourceReference,
        currency: client.currency ?? process.env.REPORTS_CURRENCY ?? "INR"
      }
    });

    importedMappings += 1;
    importedRows += result.rowsImported ?? 0;
    console.log(
      `${client.name} / ${mapping.accountName}: ${result.rowsImported ?? 0} rows`
    );
  }
}

console.log(
  `Imported ${importedRows} metric rows across ${importedMappings} mappings.`
);

async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? `GET ${url} failed with ${response.status}`);
  }

  return body;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? `POST ${url} failed with ${response.status}`);
  }

  return body;
}

function getIsoDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}
