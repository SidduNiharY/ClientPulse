# Google Ads Script To Sheets Import

This path avoids Google Ads OAuth in the app for now:

1. A Google Ads Script exports Google Ads rows into a Google Sheet.
2. The app reads that sheet through `GoogleSheetsConnector`.
3. `/api/imports` normalizes and stores the rows in `RawSourceRow` and `MetricRow`.

## Google Ads Script

Use [scripts/google-ads-mcc-to-sheets.gs](../scripts/google-ads-mcc-to-sheets.gs).

In Google Ads, open `Tools > Bulk actions > Scripts`, create a new script, paste the file, and set:

```js
spreadsheetId: "PASTE_GOOGLE_SHEET_ID_HERE",
sheetName: "Google Ads",
customerIds: ["123-456-7890"]
```

For a single account, leave `customerIds` empty. For an MCC, either list customer IDs or set `accountLabelName` to process a labeled group. The script writes these app-compatible columns:

```text
Date
Campaign
Impressions
Clicks
Cost
Conversions
Conversion value
```

It also writes account, device, and calculated columns for review. The app can ignore those extra columns during import.

### Historical Backfill

For the first database load, run the script in historical mode:

```js
dateMode: "CUSTOM",
customStartDate: "2020-01-01",
customEndDate: "",
replaceSheetRows: true
```

Use the earliest realistic client/account start date. If the date is earlier than the Google Ads account existed, Google Ads simply returns no rows for the earlier period. An empty `customEndDate` exports through yesterday, which avoids partial same-day data.

After importing that Sheet into the database, switch the script back to rolling mode for normal scheduled updates:

```js
dateMode: "LOOKBACK",
lookbackDays: 7,
endDateOffsetDays: 1
```

The report app can prepare weekly and monthly reports from the database once the historical rows are imported.

## App Mapping

Create or update the client's Google Ads mapping with:

```json
{
  "platform": "google_ads",
  "accountName": "Google Ads",
  "sourceAccountId": "123-456-7890",
  "ingestionMethod": "google_sheets",
  "config": {
    "spreadsheetId": "GOOGLE_SHEET_ID",
    "range": "Data Extraction Spreadsheet!A:Q",
    "dateField": "Date",
    "accountIdField": "Account ID",
    "publicCsv": "true",
    "sourceReference": "google-ads-sheet:GOOGLE_SHEET_ID"
  }
}
```

With `publicCsv: "true"`, the spreadsheet must be shared so anyone with the link can view it. For private spreadsheets, remove `publicCsv` and set `GOOGLE_SHEETS_CLIENT_EMAIL` plus `GOOGLE_SHEETS_PRIVATE_KEY`.

## Trigger Import

With the Next app running, call the import route through:

```bash
REPORTS_BASE_URL=http://localhost:3000 \
REPORTS_CLIENT_ID=client_id \
REPORTS_ACCOUNT_MAPPING_ID=mapping_id \
GOOGLE_ADS_SHEET_ID=sheet_id \
REPORTS_DATE_FROM=2026-06-01 \
REPORTS_DATE_TO=2026-06-07 \
node scripts/import-google-ads-sheet.mjs
```

The script posts to `/api/imports`. The route handles the database writes.

For all active Google Ads mappings that use `google_sheets`, run:

```bash
GOOGLE_ADS_SHEET_ID=1jRuA3voNNsoCUTRAkUVGJIEe5_zU6k9jLwMMi9i8Z5E \
GOOGLE_ADS_SHEET_RANGE="Data Extraction Spreadsheet!A:Q" \
node scripts/sync-google-ads-sheet-clients.mjs

REPORTS_BASE_URL=http://localhost:3000 \
GOOGLE_ADS_SHEET_ID=1jRuA3voNNsoCUTRAkUVGJIEe5_zU6k9jLwMMi9i8Z5E \
GOOGLE_ADS_SHEET_RANGE="Data Extraction Spreadsheet!A:Q" \
REPORTS_DATE_FROM=2020-01-01 \
REPORTS_DATE_TO=2026-06-07 \
REPORTS_IMPORT_MODE=replace \
node scripts/import-google-ads-sheet-all-mappings.mjs
```
