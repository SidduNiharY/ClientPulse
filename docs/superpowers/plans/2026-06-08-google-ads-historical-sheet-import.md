# Google Ads Historical Sheet Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the full historical Google Ads MCC Sheet into the database, then use stored rows for weekly and monthly reports.

**Architecture:** Keep Google Ads Scripts as the extraction layer and Google Sheets as the staging layer. The Next app remains the ingestion and reporting source of truth: it reads rows through `GoogleSheetsConnector`, filters rows by `Account ID`, writes normalized `MetricRow` records, and report generation reads only database rows.

**Tech Stack:** Google Ads Scripts, Google Sheets API via `googleapis`, Next.js API routes, Prisma, PostgreSQL, Vitest.

---

### Task 1: Confirm Sheet Contract

**Files:**
- Review: `scripts/google-ads-mcc-to-sheets.gs`
- Review: `src/server/normalization/normalizeRows.ts`
- Review: `src/server/connectors/googleSheetsConnector.ts`

- [ ] **Step 1: Confirm required columns exist in the Sheet**

The `Data Extraction Spreadsheet` tab must include these headers exactly:

```text
Date
Account ID
Campaign
campaign
device
Impressions
Clicks
Cost
Conversions
Conversion value
```

- [ ] **Step 2: Confirm import config**

Use this config for each Google Ads mapping:

```json
{
  "spreadsheetId": "1jRuA3voNNsoCUTRAkUVGJIEe5_zU6k9jLwMMi9i8Z5E",
  "range": "Data Extraction Spreadsheet!A:Q",
  "dateField": "Date",
  "accountIdField": "Account ID",
  "publicCsv": "true",
  "sourceReference": "google-ads-mcc-sheet"
}
```

Expected: the connector filters each client to its own `Account ID` before normalizing rows.

### Task 2: Add Idempotent Replace Import

**Files:**
- Modify: `src/app/api/imports/route.ts`
- Test: `tests/unit/googleSheetsConnector.test.ts`

- [ ] **Step 1: Extend import payload schema**

Add optional `importMode`:

```ts
const importRequestSchema = z.object({
  clientId: z.string().min(1),
  accountMappingId: z.string().min(1),
  dateRange: z.object({
    from: z.string().min(1),
    to: z.string().min(1)
  }),
  connectorConfig: z.record(z.string(), z.string()).default({}),
  importMode: z.enum(["append", "replace"]).default("append")
});
```

- [ ] **Step 2: Delete existing metric rows only when replacing**

Before `createMany`, add a delete operation to the transaction only when `input.importMode === "replace"`:

```ts
const metricDelete =
  input.importMode === "replace"
    ? db.metricRow.deleteMany({
        where: {
          clientId: input.clientId,
          platform: accountMapping.platform,
          sourceAccountId: accountMapping.sourceAccountId,
          occurredOn: {
            gte: new Date(input.dateRange.from),
            lte: new Date(input.dateRange.to)
          }
        }
      })
    : null;
```

Build the transaction like:

```ts
await db.$transaction([
  ...(metricDelete ? [metricDelete] : []),
  db.rawSourceRow.createMany({ data: rawRows }),
  db.metricRow.createMany({ data: metricRows }),
  db.syncRun.update({ where: { id: syncRun.id }, data: syncRunSuccessData })
]);
```

Expected: historical backfill can be rerun without duplicate report metrics.

### Task 3: Update Import Trigger Script

**Files:**
- Modify: `scripts/import-google-ads-sheet.mjs`
- Create: `scripts/import-google-ads-sheet-all-mappings.mjs`

- [ ] **Step 1: Add replace mode to the request body**

```js
const payload = {
  clientId: process.env.REPORTS_CLIENT_ID,
  accountMappingId: process.env.REPORTS_ACCOUNT_MAPPING_ID,
  importMode: process.env.REPORTS_IMPORT_MODE ?? "replace",
  dateRange: {
    from: dateFrom,
    to: dateTo
  },
  connectorConfig: {
    spreadsheetId,
    range: process.env.GOOGLE_ADS_SHEET_RANGE ?? "Data Extraction Spreadsheet!A:Q",
    dateField: process.env.GOOGLE_ADS_DATE_FIELD ?? "Date",
    accountIdField: process.env.GOOGLE_ADS_ACCOUNT_ID_FIELD ?? "Account ID",
    sourceReference:
      process.env.GOOGLE_ADS_SOURCE_REFERENCE ?? "google-ads-mcc-sheet",
    currency: process.env.REPORTS_CURRENCY ?? "INR"
  }
};
```

Expected: the default command is safe for historical backfills.

- [ ] **Step 2: Add all-mappings import command**

Create `scripts/import-google-ads-sheet-all-mappings.mjs` so the app can import every Google Ads mapping using `google_sheets` without manually running one command per client.

### Task 4: Run One Import Per Client Mapping

**Files:**
- Use: `scripts/import-google-ads-sheet.mjs`
- Use: app database account mappings

- [ ] **Step 1: Create one Google Ads mapping per client/account**

Each mapping must have:

```json
{
  "platform": "google_ads",
  "sourceAccountId": "879-820-5849",
  "ingestionMethod": "google_sheets",
  "config": {
    "spreadsheetId": "1jRuA3voNNsoCUTRAkUVGJIEe5_zU6k9jLwMMi9i8Z5E",
    "range": "Data Extraction Spreadsheet!A:Q",
    "dateField": "Date",
    "accountIdField": "Account ID",
    "publicCsv": "true",
    "sourceReference": "google-ads-mcc-sheet"
  }
}
```

- [ ] **Step 2: Import each mapping**

Run:

```bash
REPORTS_BASE_URL=http://localhost:3000 \
REPORTS_CLIENT_ID=client_id \
REPORTS_ACCOUNT_MAPPING_ID=mapping_id \
GOOGLE_ADS_SHEET_ID=1jRuA3voNNsoCUTRAkUVGJIEe5_zU6k9jLwMMi9i8Z5E \
GOOGLE_ADS_SHEET_RANGE="Data Extraction Spreadsheet!A:Q" \
REPORTS_DATE_FROM=2020-01-01 \
REPORTS_DATE_TO=2026-06-07 \
REPORTS_IMPORT_MODE=replace \
node scripts/import-google-ads-sheet.mjs
```

Expected: each run imports only rows whose `Account ID` matches that mapping's `sourceAccountId`.

### Task 5: Validate Reports

**Files:**
- Use: `src/app/(dashboard)/reports/new/page.tsx`
- Use: `src/server/reporting/reportBuilder.ts`

- [ ] **Step 1: Generate a weekly report**

Use a date range that exists in the Sheet, for example:

```text
2026-06-01 to 2026-06-07
```

Expected: report shows Google Ads spend, impressions, clicks, conversions, and conversion value from database rows.

- [ ] **Step 2: Generate a monthly report**

Use a completed month from the historical data:

```text
2026-05-01 to 2026-05-31
```

Expected: report aggregates all stored Google Ads rows for that month.

### Task 6: Switch Script To Ongoing Mode

**Files:**
- Modify: `scripts/google-ads-mcc-to-sheets.gs`

- [ ] **Step 1: Switch from historical mode after backfill**

```js
dateMode: "LOOKBACK",
lookbackDays: 7,
endDateOffsetDays: 1,
replaceSheetRows: true
```

Expected: scheduled script runs keep only the latest rolling rows in the Sheet; database imports can still replace that rolling window safely.

---

## Self-Review

Spec coverage: This plan covers historical extraction, Sheet-to-database import, duplicate prevention, per-client filtering, weekly report validation, monthly report validation, and the ongoing scheduled mode.

Placeholder scan: No placeholders remain; exact file paths, configs, commands, and expected outcomes are listed.

Type consistency: `importMode`, `accountIdField`, `sourceAccountId`, `dateField`, and `sourceReference` match the existing connector/import naming.
