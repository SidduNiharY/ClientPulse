import type { Connector } from "./types";
import {
  requireConfig,
  type DirectConnectorFetchInput
} from "./directApiHelpers";
import { normalizeRows } from "@/server/normalization/normalizeRows";

export const googleAdsDirectAuthorizationError =
  "Google Ads direct connector requires developer token, OAuth client, refresh token, and MCC login customer ID";

const connectorType = "direct_api";
const defaultGoogleAdsApiVersion = "v24";

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleAdsApiError = {
  error?: {
    message?: string;
    details?: Array<{
      errors?: Array<{
        message?: string;
        errorCode?: Record<string, string>;
      }>;
    }>;
  };
};

type GoogleAdsStreamBatch = {
  results?: GoogleAdsRow[];
};

type GoogleAdsRow = {
  campaign?: {
    id?: string;
    name?: string;
  };
  segments?: {
    date?: string;
    device?: string;
  };
  metrics?: {
    impressions?: string | number;
    clicks?: string | number;
    costMicros?: string | number;
    conversions?: string | number;
    conversionsValue?: string | number;
  };
};

export class GoogleAdsApiConnector implements Connector {
  readonly connectorType = connectorType;

  async fetch(input: DirectConnectorFetchInput) {
    requireConfig({
      config: input.config,
      keys: [
        "developerToken",
        "oauthClientId",
        "oauthClientSecret",
        "refreshToken",
        "loginCustomerId"
      ],
      error: googleAdsDirectAuthorizationError
    });

    const accessToken = await fetchGoogleAccessToken(input.config);
    const customerId = normalizeCustomerId(
      input.config.customerId ?? input.config.sourceAccountId
    );
    const loginCustomerId = normalizeCustomerId(input.config.loginCustomerId);
    const apiVersion =
      input.config.apiVersion ??
      process.env.GOOGLE_ADS_API_VERSION ??
      defaultGoogleAdsApiVersion;
    const query = input.config.query ?? buildCampaignMetricsQuery(input.dateRange);
    const batches = await searchGoogleAdsStream({
      accessToken,
      apiVersion,
      customerId,
      developerToken: input.config.developerToken,
      loginCustomerId,
      query
    });
    const importRows = batches.flatMap((batch) =>
      (batch.results ?? []).map((row) => toImportRow(row))
    );
    const sourceReference =
      input.config.sourceReference ??
      `google-ads://${customerId}/campaign?from=${input.dateRange.from}&to=${input.dateRange.to}`;
    const normalizedRows = normalizeRows({
      clientId: input.clientId,
      platform: "google_ads",
      ingestionMethod: connectorType,
      sourceAccountId: customerId,
      syncRunId: input.config.syncRunId ?? input.accountMappingId,
      sourceReference,
      dateField: "Date",
      currency: input.config.currency ?? null,
      rows: importRows
    });

    return {
      rows: normalizedRows,
      rowsImported: normalizedRows.length,
      warnings: []
    };
  }
}

async function fetchGoogleAccessToken(config: Record<string, string>) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.oauthClientId,
      client_secret: config.oauthClientSecret,
      refresh_token: config.refreshToken
    })
  });
  const token = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok || !token.access_token) {
    throw new Error(
      token.error_description ??
        token.error ??
        `Google OAuth token refresh failed with ${response.status}`
    );
  }

  return token.access_token;
}

async function searchGoogleAdsStream(input: {
  accessToken: string;
  apiVersion: string;
  customerId: string;
  developerToken: string;
  loginCustomerId: string;
  query: string;
}) {
  const response = await fetch(
    `https://googleads.googleapis.com/${input.apiVersion}/customers/${input.customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        "developer-token": input.developerToken,
        "login-customer-id": input.loginCustomerId
      },
      body: JSON.stringify({ query: input.query })
    }
  );
  const payload = (await response.json().catch(() => ([]))) as
    | GoogleAdsStreamBatch[]
    | GoogleAdsApiError;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(formatGoogleAdsError(payload, response.status));
  }

  return payload;
}

function buildCampaignMetricsQuery(dateRange: { from: string; to: string }) {
  return `
    SELECT
      segments.date,
      segments.device,
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.from}' AND '${dateRange.to}'
    ORDER BY segments.date ASC
  `;
}

function toImportRow(row: GoogleAdsRow) {
  return {
    Date: row.segments?.date ?? "",
    Campaign: row.campaign?.name ?? row.campaign?.id ?? "",
    campaign: row.campaign?.name ?? row.campaign?.id ?? "",
    device: row.segments?.device ?? "",
    Impressions: toNumber(row.metrics?.impressions),
    Clicks: toNumber(row.metrics?.clicks),
    Cost: toMicros(row.metrics?.costMicros),
    Conversions: toNumber(row.metrics?.conversions),
    "Conversion value": toNumber(row.metrics?.conversionsValue)
  };
}

function toNumber(value: string | number | undefined) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toMicros(value: string | number | undefined) {
  return toNumber(value) / 1_000_000;
}

function normalizeCustomerId(value: string | undefined) {
  const customerId = value?.replaceAll("-", "").trim();

  if (!customerId) {
    throw new Error("Google Ads direct connector requires a customer ID");
  }

  return customerId;
}

function formatGoogleAdsError(
  payload: GoogleAdsApiError | GoogleAdsStreamBatch[],
  status: number
) {
  if (!Array.isArray(payload)) {
    const firstError = payload.error?.details
      ?.flatMap((detail) => detail.errors ?? [])
      .find((error) => error.message);

    return (
      firstError?.message ??
      payload.error?.message ??
      `Google Ads API request failed with ${status}`
    );
  }

  return `Google Ads API request failed with ${status}`;
}
