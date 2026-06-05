import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db/client";
import {
  decryptCredentialPayload,
  encryptCredentialPayload
} from "@/server/connections/credentialCrypto";
import {
  buildOAuthAuthorizationUrl,
  getOAuthClientConfig,
  oauthProviders,
  parseSignedOAuthState,
  toDirectConnectorConfig,
  validateCredentialFields,
  type OAuthProvider
} from "@/server/connections/oauth";

const providerSchema = z.enum(["google_ads", "meta_ads", "ga4", "shopify"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    try {
      return await handleOAuthCallback({ request, code, state });
    } catch (error) {
      return NextResponse.json(
        { error: getErrorMessage(error, "OAuth callback failed") },
        { status: 400 }
      );
    }
  }

  const parsed = z
    .object({
      provider: providerSchema,
      accountMappingId: z.string().min(1),
      shopDomain: z.string().optional()
    })
    .safeParse({
      provider: url.searchParams.get("provider"),
      accountMappingId: url.searchParams.get("accountMappingId"),
      shopDomain: url.searchParams.get("shopDomain") ?? undefined
    });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid direct connection request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { clientId } = getOAuthClientConfig(parsed.data.provider, process.env);

  if (!clientId) {
    return NextResponse.json(
      {
        error: `${oauthProviders[parsed.data.provider].clientIdEnv} is required to start OAuth`
      },
      { status: 500 }
    );
  }

  const accountMapping = await db.accountMapping.findUnique({
    where: { id: parsed.data.accountMappingId },
    select: { platform: true, sourceAccountId: true }
  });

  if (!accountMapping) {
    return NextResponse.json(
      { error: "Account mapping not found" },
      { status: 400 }
    );
  }

  if (accountMapping.platform !== parsed.data.provider) {
    return NextResponse.json(
      { error: "OAuth provider does not match the account mapping" },
      { status: 400 }
    );
  }

  const authorizationUrl = buildOAuthAuthorizationUrl({
    provider: parsed.data.provider,
    accountMappingId: parsed.data.accountMappingId,
    origin: getAppOrigin(request),
    clientId,
    stateSecret: getOAuthStateSecret(),
    nonce: randomUUID(),
    shopDomain:
      parsed.data.shopDomain ??
      (parsed.data.provider === "shopify"
        ? accountMapping.sourceAccountId
        : undefined)
  });

  return NextResponse.redirect(authorizationUrl);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = z
    .object({
      provider: providerSchema,
      accountMappingId: z.string().min(1),
      credentials: z.record(z.string(), z.string()).default({})
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid direct connection payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const missing = validateCredentialFields(
    parsed.data.provider,
    parsed.data.credentials
  );

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "Missing direct credential fields",
        missing
      },
      { status: 400 }
    );
  }

  try {
    await persistDirectCredential({
      provider: parsed.data.provider,
      accountMappingId: parsed.data.accountMappingId,
      credentials: parsed.data.credentials,
      scopes: []
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Could not save direct credentials") },
      { status: 400 }
    );
  }

  return NextResponse.json({
    provider: parsed.data.provider,
    accountMappingId: parsed.data.accountMappingId,
    status: "authorized",
    message: "Direct credentials saved and encrypted."
  });
}

async function handleOAuthCallback(input: {
  request: Request;
  code: string;
  state: string;
}) {
  const state = parseSignedOAuthState(input.state, getOAuthStateSecret());
  const accountMapping = await db.accountMapping.findUniqueOrThrow({
    where: { id: state.accountMappingId },
    select: {
      id: true,
      platform: true,
      sourceAccountId: true,
      config: true
    }
  });

  if (accountMapping.platform !== state.provider) {
    throw new Error("OAuth provider does not match the account mapping");
  }

  const tokenResponse = await exchangeAuthorizationCode({
    provider: state.provider,
    code: input.code,
    redirectUri: `${getAppOrigin(input.request)}/api/connections/oauth`,
    shopDomain: state.shopDomain ?? accountMapping.sourceAccountId
  });
  const credentials = buildCredentialPayload({
    provider: state.provider,
    tokenResponse,
    sourceAccountId: accountMapping.sourceAccountId,
    config: jsonConfigToRecord(accountMapping.config),
    shopDomain: state.shopDomain
  });

  await persistDirectCredential({
    provider: state.provider,
    accountMappingId: state.accountMappingId,
    credentials,
    scopes: String(tokenResponse.scope ?? "")
      .split(/[,\s]+/)
      .filter(Boolean)
  });

  return NextResponse.redirect(
    new URL(`/connections?connected=${state.provider}`, getAppOrigin(input.request))
  );
}

async function exchangeAuthorizationCode(input: {
  provider: OAuthProvider;
  code: string;
  redirectUri: string;
  shopDomain?: string;
}) {
  const { clientId, clientSecret, definition } = getOAuthClientConfig(
    input.provider,
    process.env
  );

  if (!clientId || !clientSecret) {
    throw new Error(
      `${definition.clientIdEnv} and ${definition.clientSecretEnv} are required for OAuth callback exchange`
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: input.code
  });
  let tokenUrl = definition.tokenEndpoint;

  if (input.provider === "google_ads" || input.provider === "ga4") {
    body.set("redirect_uri", input.redirectUri);
    body.set("grant_type", "authorization_code");
  }

  if (input.provider === "shopify") {
    tokenUrl = `https://${normalizeShopDomain(
      input.shopDomain
    )}/admin/oauth/access_token`;
  }

  if (input.provider === "meta_ads") {
    body.set("redirect_uri", input.redirectUri);
  }

  if (input.provider === "meta_ads") {
    const url = new URL(tokenUrl);

    body.forEach((value, key) => url.searchParams.set(key, value));

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" }
    });

    return parseTokenExchangeResponse(input.provider, response);
  }

  if (input.provider === "shopify") {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: input.code
      })
    });

    return parseTokenExchangeResponse(input.provider, response);
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body
  });

  return parseTokenExchangeResponse(input.provider, response);
}

async function parseTokenExchangeResponse(
  provider: OAuthProvider,
  response: Response
) {
  if (!response.ok) {
    throw new Error(
      `${oauthProviders[provider].label} OAuth token exchange failed with ${response.status}`
    );
  }

  return (await response.json()) as Record<string, string | number | undefined>;
}

async function persistDirectCredential(input: {
  provider: OAuthProvider;
  accountMappingId: string;
  credentials: Record<string, string>;
  scopes: string[];
}) {
  const accountMapping = await db.accountMapping.findUnique({
    where: { id: input.accountMappingId },
    select: { id: true, platform: true }
  });

  if (!accountMapping) {
    throw new Error("Account mapping not found");
  }

  if (accountMapping.platform !== input.provider) {
    throw new Error("Credential provider does not match the account mapping");
  }

  const missing = validateCredentialFields(input.provider, input.credentials);

  if (missing.length > 0) {
    throw new Error(`Missing direct credential fields: ${missing.join(", ")}`);
  }

  const connectorConfig = toDirectConnectorConfig(
    input.provider,
    input.credentials
  );
  const encryptedToken = encryptCredentialPayload(
    connectorConfig,
    getCredentialEncryptionSecret()
  );

  await db.$transaction(async (tx) => {
    await tx.directCredential.deleteMany({
      where: {
        provider: input.provider,
        accountMappingId: input.accountMappingId
      }
    });
    await tx.directCredential.create({
      data: {
        provider: input.provider,
        accountMappingId: input.accountMappingId,
        encryptedToken,
        refreshToken: null,
        scopes: input.scopes,
        status: "authorized"
      }
    });
    await tx.accountMapping.update({
      where: { id: input.accountMappingId },
      data: { ingestionMethod: "direct_api" }
    });

    const updatedConnector = await tx.connector.updateMany({
      where: {
        accountMappingId: input.accountMappingId,
        connectorType: "direct_api"
      },
      data: {
        connectorType: "direct_api",
        healthStatus: "healthy",
        latestError: null
      }
    });

    if (updatedConnector.count === 0) {
      await tx.connector.create({
        data: {
          accountMappingId: input.accountMappingId,
          connectorType: "direct_api",
          healthStatus: "healthy"
        }
      });
    }
  });

  // Prove the encrypted payload can be read before reporting success.
  decryptCredentialPayload(encryptedToken, getCredentialEncryptionSecret());
}

function buildCredentialPayload(input: {
  provider: OAuthProvider;
  tokenResponse: Record<string, string | number | undefined>;
  sourceAccountId: string;
  config: Record<string, string>;
  shopDomain?: string;
}): Record<string, string> {
  const accessToken = String(input.tokenResponse.access_token ?? "");
  const refreshToken = String(input.tokenResponse.refresh_token ?? accessToken);

  if (input.provider === "google_ads") {
    return {
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
      oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      refreshToken,
      loginCustomerId:
        input.config.loginCustomerId ?? input.sourceAccountId.replaceAll("-", "")
    };
  }

  if (input.provider === "ga4") {
    return {
      propertyId: input.config.propertyId ?? input.sourceAccountId,
      oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      refreshToken
    };
  }

  if (input.provider === "meta_ads") {
    return {
      accessToken,
      adAccountId: input.config.adAccountId ?? input.sourceAccountId
    };
  }

  return {
    storeDomain:
      input.shopDomain ?? input.config.storeDomain ?? input.sourceAccountId,
    accessToken
  };
}

function getAppOrigin(request: Request) {
  return process.env.APP_BASE_URL ?? new URL(request.url).origin;
}

function normalizeShopDomain(value: string | undefined) {
  if (!value) {
    throw new Error("Shopify OAuth requires a shop domain");
  }

  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getOAuthStateSecret() {
  return process.env.OAUTH_STATE_SECRET ?? getCredentialEncryptionSecret();
}

function getCredentialEncryptionSecret() {
  const secret = process.env.DIRECT_CREDENTIAL_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("DIRECT_CREDENTIAL_ENCRYPTION_KEY is required");
  }

  return secret;
}

function jsonConfigToRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, configValue]) => [key, String(configValue)])
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
