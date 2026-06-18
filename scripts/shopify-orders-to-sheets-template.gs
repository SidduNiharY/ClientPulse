/**
 * Shopify orders export template for Reports Generator.
 *
 * Paste into Google Apps Script, set CONFIG, and schedule daily/weekly.
 * Output columns must stay in this order for the app normalizer:
 * date,channel,total_orders,total_revenue
 */
var CONFIG = {
  spreadsheetId: "PASTE_GOOGLE_SHEET_ID_HERE",
  sheetName: "Shopify",
  shopDomain: "your-store.myshopify.com",
  adminAccessToken: "PASTE_SHOPIFY_ADMIN_ACCESS_TOKEN_HERE",
  apiVersion: "YYYY-MM",

  dateMode: "LOOKBACK",
  customStartDate: "2026-06-01",
  customEndDate: "2026-06-07",
  lookbackDays: 7,
  endDateOffsetDays: 1,
  replaceSheetRows: true
};

var HEADERS = ["date", "channel", "total_orders", "total_revenue"];

function main() {
  var dateRange = getDateRange_();
  var orders = fetchOrders_(dateRange);
  var rows = groupOrders_(orders);
  writeRows_(rows);
  Logger.log(
    "Exported %s Shopify channel rows from %s orders.",
    rows.length,
    orders.length
  );
}

function fetchOrders_(dateRange) {
  var minDate = encodeURIComponent(dateRange.from + "T00:00:00Z");
  var maxDate = encodeURIComponent(dateRange.to + "T23:59:59Z");
  var url =
    "https://" +
    CONFIG.shopDomain +
    "/admin/api/" +
    CONFIG.apiVersion +
    "/orders.json?status=any&limit=250&created_at_min=" +
    minDate +
    "&created_at_max=" +
    maxDate +
    "&fields=created_at,source_name,total_price,total_price_set";
  var orders = [];

  while (url) {
    var response = UrlFetchApp.fetch(url, {
      headers: {
        "X-Shopify-Access-Token": CONFIG.adminAccessToken
      },
      muteHttpExceptions: true
    });
    var status = response.getResponseCode();

    if (status >= 300) {
      throw new Error("Shopify export failed with HTTP " + status + ": " + response.getContentText());
    }

    var payload = JSON.parse(response.getContentText());
    orders = orders.concat(payload.orders || []);
    url = getNextPageUrl_(response.getAllHeaders());
  }

  return orders;
}

function groupOrders_(orders) {
  var grouped = {};

  for (var index = 0; index < orders.length; index++) {
    var order = orders[index];
    var date = String(order.created_at || "").slice(0, 10);
    var channel = order.source_name || "unknown";
    var key = date + "|" + channel;

    if (!grouped[key]) {
      grouped[key] = {
        date: date,
        channel: channel,
        totalOrders: 0,
        totalRevenue: 0
      };
    }

    grouped[key].totalOrders += 1;
    grouped[key].totalRevenue += getOrderRevenue_(order);
  }

  return Object.keys(grouped)
    .sort()
    .map(function(key) {
      var row = grouped[key];
      return [
        row.date,
        row.channel,
        row.totalOrders,
        roundCurrency_(row.totalRevenue)
      ];
    });
}

function getOrderRevenue_(order) {
  if (
    order.total_price_set &&
    order.total_price_set.shop_money &&
    order.total_price_set.shop_money.amount
  ) {
    return toNumber_(order.total_price_set.shop_money.amount);
  }

  return toNumber_(order.total_price);
}

function getNextPageUrl_(headers) {
  var linkHeader = headers.Link || headers.link || "";
  var links = String(linkHeader).split(",");

  for (var index = 0; index < links.length; index++) {
    var part = links[index];

    if (part.indexOf('rel="next"') !== -1) {
      return part.split(";")[0].replace(/[<>]/g, "").trim();
    }
  }

  return "";
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

function roundCurrency_(value) {
  return Math.round(value * 100) / 100;
}

function toNumber_(value) {
  var number = Number(value || 0);
  return isFinite(number) ? number : 0;
}
