/**
 * Google Ads MCC or single-account export for Reports Generator.
 *
 * Paste this file into Google Ads > Tools > Bulk actions > Scripts.
 * The sheet rows produced here match the app's Google Ads normalizer:
 * Date, Campaign, Impressions, Clicks, Cost, Conversions, Conversion value.
 */
var CONFIG = {
  spreadsheetId: "1jRuA3voNNsoCUTRAkUVGJIEe5_zU6k9jLwMMi9i8Z5E",
  sheetName: "Data Extraction Spreadsheet",

  // Leave empty in a single Google Ads account. In an MCC, either list child
  // customer IDs here or set accountLabelName below to process a labeled group.
  customerIds: [
    "879-820-5849",
    "591-774-3719",
    "548-555-7741",
    "647-886-8578",
    "829-741-0074",
    "345-181-3105",
    "907-432-8900",
    "642-652-2547",
    "411-099-0555",
    "364-564-9078",
    "524-238-0366",
    "401-027-3911",
    "291-319-2882",
    "695-814-1411"
  ],
  accountLabelName: "",
  maxManagerAccounts: 50,

  // Use CUSTOM for a one-time historical backfill. After the database backfill,
  // switch back to LOOKBACK for scheduled daily/weekly updates.
  dateMode: "CUSTOM",
  customStartDate: "2020-01-01",
  customEndDate: "",

  // Daily schedules usually want yesterday plus the previous 6 days.
  lookbackDays: 7,
  endDateOffsetDays: 1,

  // Replacing the sheet keeps scheduled imports idempotent for the date range.
  replaceSheetRows: true
};

var HEADERS = [
  "Date",
  "Account ID",
  "Account",
  "Campaign ID",
  "Campaign",
  "campaign",
  "device",
  "Impressions",
  "Clicks",
  "Cost",
  "Conversions",
  "Conversion value",
  "CTR",
  "Average CPC",
  "Conversion rate",
  "Cost per conversion",
  "ROAS"
];

function main() {
  var dateRange = getDateRange_();
  var input = JSON.stringify(dateRange);

  Logger.log(
    "Starting Google Ads export for %s to %s. Sheet: %s / %s",
    dateRange.from + " through " + dateRange.to,
    CONFIG.customerIds.length ? CONFIG.customerIds.length + " configured accounts" : "selected accounts",
    CONFIG.spreadsheetId,
    CONFIG.sheetName
  );

  if (isManagerScript_()) {
    prepareSheet_();
    getManagedAccountSelector_().executeInParallel(
      "processClientAccount",
      "writeManagerResults",
      input
    );
    return;
  }

  var payload = JSON.parse(processClientAccount(input));
  prepareSheet_();
  writeRows_(payload.rows);
  Logger.log("Exported %s rows for %s.", payload.rows.length, payload.accountId);
}

function processClientAccount(input) {
  var dateRange = JSON.parse(input);
  var account = AdsApp.currentAccount();
  var accountId = account.getCustomerId();
  var accountName = account.getName() || accountId;
  var rows = [];
  var report = AdsApp.search(buildCampaignQuery_(dateRange));

  while (report.hasNext()) {
    var row = report.next();
    var impressions = toNumber_(row.metrics.impressions);
    var clicks = toNumber_(row.metrics.clicks);
    var cost = microsToCurrency_(row.metrics.costMicros);
    var conversions = toNumber_(row.metrics.conversions);
    var conversionValue = toNumber_(row.metrics.conversionsValue);

    rows.push([
      row.segments.date,
      accountId,
      accountName,
      String(row.campaign.id || ""),
      row.campaign.name || "",
      row.campaign.name || "",
      row.segments.device || "",
      impressions,
      clicks,
      cost,
      conversions,
      conversionValue,
      safeRatio_(clicks, impressions),
      safeRatio_(cost, clicks),
      safeRatio_(conversions, clicks),
      safeRatio_(cost, conversions),
      safeRatio_(conversionValue, cost)
    ]);
  }

  return JSON.stringify({
    accountId: accountId,
    accountName: accountName,
    rows: rows
  });
}

function writeManagerResults(results) {
  var rows = [];
  var errors = [];

  for (var i = 0; i < results.length; i++) {
    var result = results[i];

    if (result.getStatus() !== "OK") {
      errors.push(
        result.getCustomerId() + ": " + (result.getError() || result.getStatus())
      );
      continue;
    }

    var payload = JSON.parse(result.getReturnValue() || '{"rows":[]}');
    Logger.log(
      "Account %s returned %s rows.",
      payload.accountId || result.getCustomerId(),
      (payload.rows || []).length
    );
    rows = rows.concat(payload.rows || []);
  }

  writeRows_(rows);
  Logger.log("Exported %s Google Ads rows.", rows.length);

  if (errors.length > 0) {
    Logger.log("Accounts with errors: %s", errors.join(" | "));
  }
}

function buildCampaignQuery_(dateRange) {
  return [
    "SELECT",
    "  segments.date,",
    "  segments.device,",
    "  campaign.id,",
    "  campaign.name,",
    "  metrics.impressions,",
    "  metrics.clicks,",
    "  metrics.cost_micros,",
    "  metrics.conversions,",
    "  metrics.conversions_value",
    "FROM campaign",
    "WHERE segments.date BETWEEN '" + dateRange.from + "' AND '" + dateRange.to + "'",
    "ORDER BY segments.date ASC"
  ].join(" ");
}

function getManagedAccountSelector_() {
  var selector = AdsManagerApp.accounts();

  if (CONFIG.customerIds.length > 0) {
    selector = selector.withIds(CONFIG.customerIds);
  }

  if (CONFIG.accountLabelName) {
    selector = selector.withCondition(
      "LabelNames CONTAINS '" + CONFIG.accountLabelName.replace(/'/g, "\\'") + "'"
    );
  }

  return selector.withLimit(CONFIG.maxManagerAccounts);
}

function prepareSheet_() {
  var sheet = getSheet_();

  if (CONFIG.replaceSheetRows) {
    sheet.clearContents();
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
}

function writeRows_(rows) {
  var sheet = getSheet_();

  if (rows.length === 0) {
    Logger.log("No rows to write. Sheet currently has %s rows.", sheet.getLastRow());
    return;
  }

  rows.sort(function(a, b) {
    if (a[0] === b[0]) return String(a[1]).localeCompare(String(b[1]));
    return String(a[0]).localeCompare(String(b[0]));
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length)
      .setValues(rows);
  SpreadsheetApp.flush();
  Logger.log(
    "Sheet write complete. URL: %s | Tab: %s | Rows now: %s | Columns now: %s",
    sheet.getParent().getUrl(),
    sheet.getName(),
    sheet.getLastRow(),
    sheet.getLastColumn()
  );
}

function getSheet_() {
  var spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(CONFIG.sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.sheetName);
  }

  return sheet;
}

function getDateRange_() {
  var timeZone = AdsApp.currentAccount().getTimeZone();
  var endDate = new Date();
  endDate.setDate(endDate.getDate() - CONFIG.endDateOffsetDays);

  if (CONFIG.dateMode === "CUSTOM") {
    return {
      from: CONFIG.customStartDate,
      to: CONFIG.customEndDate || Utilities.formatDate(endDate, timeZone, "yyyy-MM-dd")
    };
  }

  var startDate = new Date(endDate.getTime());
  startDate.setDate(startDate.getDate() - CONFIG.lookbackDays + 1);

  return {
    from: Utilities.formatDate(startDate, timeZone, "yyyy-MM-dd"),
    to: Utilities.formatDate(endDate, timeZone, "yyyy-MM-dd")
  };
}

function isManagerScript_() {
  return typeof AdsManagerApp !== "undefined";
}

function toNumber_(value) {
  var number = Number(value || 0);
  return isFinite(number) ? number : 0;
}

function microsToCurrency_(value) {
  return toNumber_(value) / 1000000;
}

function safeRatio_(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
