/**
 * Meta Ads campaign export template for Reports Generator.
 *
 * Paste into Google Apps Script, set CONFIG, and schedule daily/weekly.
 * Output columns must stay in this order for the app normalizer:
 * date,campaign,impressions,clicks,spend,purchases,purchase_value,leads
 */
var CONFIG = {
  spreadsheetId: "PASTE_GOOGLE_SHEET_ID_HERE",
  sheetName: "Meta Ads",
  graphVersion: "vXX.X",
  adAccountId: "act_1234567890",
  accessToken: "PASTE_META_ACCESS_TOKEN_HERE",

  dateMode: "LOOKBACK",
  customStartDate: "2026-06-01",
  customEndDate: "2026-06-07",
  lookbackDays: 7,
  endDateOffsetDays: 1,
  replaceSheetRows: true
};

var HEADERS = [
  "date",
  "campaign",
  "impressions",
  "clicks",
  "spend",
  "purchases",
  "purchase_value",
  "leads"
];

function main() {
  var dateRange = getDateRange_();
  var rows = fetchInsightRows_(dateRange).map(toSheetRow_);
  writeRows_(rows);
  Logger.log(
    "Exported %s Meta Ads rows for %s through %s.",
    rows.length,
    dateRange.from,
    dateRange.to
  );
}

function fetchInsightRows_(dateRange) {
  var fields = [
    "date_start",
    "campaign_name",
    "impressions",
    "clicks",
    "spend",
    "actions",
    "action_values"
  ].join(",");
  var timeRange = JSON.stringify({
    since: dateRange.from,
    until: dateRange.to
  });
  var url =
    "https://graph.facebook.com/" +
    CONFIG.graphVersion +
    "/" +
    CONFIG.adAccountId +
    "/insights?" +
    [
      "level=campaign",
      "time_increment=1",
      "fields=" + encodeURIComponent(fields),
      "time_range=" + encodeURIComponent(timeRange),
      "access_token=" + encodeURIComponent(CONFIG.accessToken)
    ].join("&");
  var rows = [];

  while (url) {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var status = response.getResponseCode();

    if (status >= 300) {
      throw new Error("Meta export failed with HTTP " + status + ": " + response.getContentText());
    }

    var payload = JSON.parse(response.getContentText());
    rows = rows.concat(payload.data || []);
    url = payload.paging && payload.paging.next ? payload.paging.next : "";
  }

  return rows;
}

function toSheetRow_(row) {
  return [
    row.date_start || "",
    row.campaign_name || "",
    toNumber_(row.impressions),
    toNumber_(row.clicks),
    toNumber_(row.spend),
    actionMetric_(row.actions, ["purchase", "omni_purchase"]),
    actionMetric_(row.action_values, ["purchase", "omni_purchase"]),
    actionMetric_(row.actions, ["lead", "onsite_conversion.lead_grouped"])
  ];
}

function actionMetric_(items, actionTypes) {
  var total = 0;
  var list = items || [];

  for (var index = 0; index < list.length; index++) {
    if (actionTypes.indexOf(list[index].action_type) !== -1) {
      total += toNumber_(list[index].value);
    }
  }

  return total;
}

function writeRows_(rows) {
  var sheet = getSheet_();

  if (CONFIG.replaceSheetRows) {
    sheet.clearContents();
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length)
      .setValues(rows);
  }

  SpreadsheetApp.flush();
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
  var timeZone = Session.getScriptTimeZone();
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

function toNumber_(value) {
  var number = Number(value || 0);
  return isFinite(number) ? number : 0;
}
