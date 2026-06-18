# Meta and Shopify Script To Sheets Import

Use this path when direct API credentials should stay outside the app:

1. A Google Apps Script exports platform rows into a Google Sheet.
2. The app reads that sheet through `GoogleSheetsConnector`.
3. `/api/imports` normalizes and stores rows in `RawSourceRow` and `MetricRow`.

Script and Google Sheets imports default to `replace` mode, so rerunning the
same date window replaces matching metric rows.

## Meta Ads

Use [scripts/meta-ads-to-sheets-template.gs](../scripts/meta-ads-to-sheets-template.gs).

Set the template config:

```js
spreadsheetId: "PASTE_GOOGLE_SHEET_ID_HERE",
sheetName: "Meta Ads",
graphVersion: "vXX.X",
adAccountId: "act_1234567890",
accessToken: "PASTE_META_ACCESS_TOKEN_HERE"
```

The sheet must produce these columns:

```text
date
campaign
impressions
clicks
spend
purchases
purchase_value
leads
```

Create or update the client's Meta Ads mapping with:

```json
{
  "platform": "meta_ads",
  "accountName": "Meta Ads",
  "sourceAccountId": "act_1234567890",
  "ingestionMethod": "google_sheets",
  "config": {
    "spreadsheetId": "GOOGLE_SHEET_ID",
    "range": "Meta Ads!A:H",
    "dateField": "date",
    "publicCsv": "true",
    "sourceReference": "meta-script-sheet:GOOGLE_SHEET_ID"
  }
}
```

## Shopify

Use [scripts/shopify-orders-to-sheets-template.gs](../scripts/shopify-orders-to-sheets-template.gs).

Set the template config:

```js
spreadsheetId: "PASTE_GOOGLE_SHEET_ID_HERE",
sheetName: "Shopify",
shopDomain: "your-store.myshopify.com",
adminAccessToken: "PASTE_SHOPIFY_ADMIN_ACCESS_TOKEN_HERE",
apiVersion: "YYYY-MM"
```

The sheet must produce these columns:

```text
date
channel
total_orders
total_revenue
```

Create or update the client's Shopify mapping with:

```json
{
  "platform": "shopify",
  "accountName": "Shopify",
  "sourceAccountId": "your-store.myshopify.com",
  "ingestionMethod": "google_sheets",
  "config": {
    "spreadsheetId": "GOOGLE_SHEET_ID",
    "range": "Shopify!A:D",
    "dateField": "date",
    "publicCsv": "true",
    "sourceReference": "shopify-script-sheet:GOOGLE_SHEET_ID"
  }
}
```

## Import Response

`POST /api/imports` returns:

```json
{
  "syncRunId": "sync_run_id",
  "status": "succeeded",
  "rowsImported": 6,
  "metricsAdded": 6,
  "metricsReplaced": 4,
  "warnings": [],
  "healthStatus": "healthy"
}
```

The imports page shows the same fields after each run.
