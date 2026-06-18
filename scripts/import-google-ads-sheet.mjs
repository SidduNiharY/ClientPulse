#!/usr/bin/env node

const required = [
  "REPORTS_BASE_URL",
  "REPORTS_CLIENT_ID",
  "REPORTS_ACCOUNT_MAPPING_ID",
  "GOOGLE_ADS_SHEET_ID"
];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const baseUrl = process.env.REPORTS_BASE_URL.replace(/\/$/, "");
const dateFrom = process.env.REPORTS_DATE_FROM ?? getIsoDateDaysAgo(7);
const dateTo = process.env.REPORTS_DATE_TO ?? getIsoDateDaysAgo(1);
const payload = {
  clientId: process.env.REPORTS_CLIENT_ID,
  accountMappingId: process.env.REPORTS_ACCOUNT_MAPPING_ID,
  importMode: process.env.REPORTS_IMPORT_MODE ?? "replace",
  dateRange: {
    from: dateFrom,
    to: dateTo
  },
  connectorConfig: {
    spreadsheetId: process.env.GOOGLE_ADS_SHEET_ID,
    range: process.env.GOOGLE_ADS_SHEET_RANGE ?? "Data Extraction Spreadsheet!A:Q",
    dateField: process.env.GOOGLE_ADS_DATE_FIELD ?? "Date",
    accountIdField: process.env.GOOGLE_ADS_ACCOUNT_ID_FIELD ?? "Account ID",
    publicCsv: process.env.GOOGLE_ADS_PUBLIC_CSV ?? "true",
    sourceReference:
      process.env.GOOGLE_ADS_SOURCE_REFERENCE ?? "google-ads-mcc-sheet",
    currency: process.env.REPORTS_CURRENCY ?? "INR"
  }
};

const response = await fetch(`${baseUrl}/api/imports`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});
const body = await response.json().catch(() => ({}));

if (!response.ok) {
  throw new Error(body.error ?? `Import failed with ${response.status}`);
}

console.log(
  `Imported ${body.rowsImported ?? 0} metric rows for ${payload.clientId} / ${payload.accountMappingId}.`
);

if (Array.isArray(body.warnings) && body.warnings.length > 0) {
  console.warn(`Warnings: ${body.warnings.join(" | ")}`);
}

function getIsoDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}
