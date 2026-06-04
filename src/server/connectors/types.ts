export type Platform = "google_ads" | "meta_ads" | "ga4" | "shopify" | "manual";

export type IngestionMethod =
  | "direct_api"
  | "platform_script"
  | "google_sheets"
  | "bigquery"
  | "csv_upload"
  | "third_party_connector";

export type MetricName =
  | "impressions"
  | "clicks"
  | "spend"
  | "conversions"
  | "conversion_value"
  | "revenue"
  | "orders"
  | "leads"
  | "sessions"
  | "active_users"
  | "transactions"
  | "reach"
  | "frequency";

export type DateRange = {
  from: string;
  to: string;
};

export type SourceTrace = {
  platform: Platform;
  connectorType: string;
  sourceAccountId: string;
  originalFieldName: string;
  sourceReference: string;
  syncRunId: string;
  dateRange: DateRange;
  importedAt: string;
};

export type NormalizedMetricRow = {
  clientId: string;
  platform: Platform;
  ingestionMethod: IngestionMethod;
  sourceAccountId: string;
  metricName: MetricName;
  metricValue: number;
  currency: string | null;
  occurredOn: string;
  dimensions: Record<string, string>;
  sourceTrace: SourceTrace;
};

export type ConnectorResult = {
  rows: NormalizedMetricRow[];
  rowsImported: number;
  warnings: string[];
};

export interface Connector {
  readonly connectorType: string;
  fetch(input: {
    clientId: string;
    accountMappingId: string;
    dateRange: DateRange;
    config: Record<string, string>;
  }): Promise<ConnectorResult>;
}
