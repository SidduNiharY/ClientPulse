import type {
  IngestionMethod,
  NormalizedMetricRow,
  Platform
} from "@/server/connectors/types";

type RawImportRow = Record<string, string | number | null | undefined>;

const platformMetricMap: Record<Platform, Record<string, string>> = {
  google_ads: {
    Impressions: "impressions",
    Clicks: "clicks",
    Cost: "spend",
    Conversions: "conversions",
    "Conversion value": "conversion_value"
  },
  meta_ads: {
    impressions: "impressions",
    clicks: "clicks",
    spend: "spend",
    purchases: "conversions",
    purchase_value: "conversion_value",
    leads: "leads"
  },
  ga4: {
    sessions: "sessions",
    activeUsers: "active_users",
    purchaseRevenue: "revenue",
    transactions: "transactions"
  },
  shopify: {
    total_orders: "orders",
    total_revenue: "revenue"
  },
  manual: {
    revenue: "revenue",
    leads: "leads",
    orders: "orders"
  }
};

export function normalizeRows(input: {
  clientId: string;
  platform: Platform;
  ingestionMethod: IngestionMethod;
  sourceAccountId: string;
  syncRunId: string;
  sourceReference: string;
  dateField: string;
  currency: string | null;
  rows: RawImportRow[];
}): NormalizedMetricRow[] {
  const metricMap = platformMetricMap[input.platform];

  return input.rows.flatMap((row) => {
    const occurredOn = String(row[input.dateField]);

    return Object.entries(metricMap).flatMap(([sourceField, metricName]) => {
      const rawValue = row[sourceField];
      const metricValue = Number(rawValue);

      if (!Number.isFinite(metricValue)) {
        return [];
      }

      return [
        {
          clientId: input.clientId,
          platform: input.platform,
          ingestionMethod: input.ingestionMethod,
          sourceAccountId: input.sourceAccountId,
          metricName: metricName as NormalizedMetricRow["metricName"],
          metricValue,
          currency: input.currency,
          occurredOn,
          dimensions: {
            campaign: String(row.campaign ?? row.Campaign ?? ""),
            channel: String(row.channel ?? ""),
            device: String(row.device ?? "")
          },
          sourceTrace: {
            platform: input.platform,
            connectorType: input.ingestionMethod,
            sourceAccountId: input.sourceAccountId,
            originalFieldName: sourceField,
            sourceReference: input.sourceReference,
            syncRunId: input.syncRunId,
            dateRange: { from: occurredOn, to: occurredOn },
            importedAt: new Date().toISOString()
          }
        }
      ];
    });
  });
}
