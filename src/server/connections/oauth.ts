import { createHmac, timingSafeEqual } from "node:crypto";

export type OAuthProvider = "google_ads" | "meta_ads" | "ga4" | "shopify";

export type OAuthState = {
  provider: OAuthProvider;
  accountMappingId: string;
  nonce: string;
  shopDomain?: string;
};

type OAuthProviderDefinition = {
  label: string;
  authEndpoint: string;
  tokenEndpoint: string;
  defaultScopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
};

export const requiredCredentialFields: Record<OAuthProvider, string[]> = {
  google_ads: [
    "developerToken",
    "oauthClientId",
    "oauthClientSecret",
    "refreshToken",
    "loginCustomerId"
  ],
  meta_ads: ["accessToken", "adAccountId"],
  ga4: ["propertyId", "oauthClientId", "oauthClientSecret", "refreshToken"],
  shopify: ["storeDomain", "accessToken"]
};

export const oauthProviders: Record<OAuthProvider, OAuthProviderDefinition> = {
  google_ads: {
    label: "Google Ads",
    authEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    defaultScopes: ["https://www.googleapis.com/auth/adwords"],
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET"
  },
  meta_ads: {
    label: "Meta Ads",
    authEndpoint: "https://www.facebook.com/dialog/oauth",
    tokenEndpoint: "https://graph.facebook.com/oauth/access_token",
    defaultScopes: ["ads_read", "business_management"],
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET"
  },
  ga4: {
    label: "GA4",
    authEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    defaultScopes: [
      "https://www.googleapis.com/auth/analytics.readonly"
    ],
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET"
  },
  shopify: {
    label: "Shopify",
    authEndpoint: "",
    tokenEndpoint: "",
    defaultScopes: ["read_orders", "read_products"],
    clientIdEnv: "SHOPIFY_CLIENT_ID",
    clientSecretEnv: "SHOPIFY_CLIENT_SECRET"
  }
};

export function buildOAuthAuthorizationUrl(input: {
  provider: OAuthProvider;
  accountMappingId: string;
  origin: string;
  clientId: string;
  stateSecret: string;
  nonce: string;
  shopDomain?: string;
}) {
  const definition = oauthProviders[input.provider];
  const redirectUri = `${input.origin}/api/connections/oauth`;
  const state = createSignedOAuthState(
    {
      provider: input.provider,
      accountMappingId: input.accountMappingId,
      nonce: input.nonce,
      shopDomain: input.shopDomain
    },
    input.stateSecret
  );
  const endpoint =
    input.provider === "shopify"
      ? `https://${requireShopDomain(input.shopDomain)}/admin/oauth/authorize`
      : definition.authEndpoint;
  const url = new URL(endpoint);

  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  if (input.provider === "shopify") {
    url.searchParams.set("scope", definition.defaultScopes.join(","));
  } else {
    url.searchParams.set("scope", definition.defaultScopes.join(" "));
  }

  if (input.provider === "google_ads" || input.provider === "ga4") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("prompt", "consent");
  }

  return url;
}

export function createSignedOAuthState(state: OAuthState, secret: string) {
  const encodedState = Buffer.from(JSON.stringify(state), "utf8").toString(
    "base64url"
  );
  const signature = signState(encodedState, secret);

  return `${encodedState}.${signature}`;
}

export function parseSignedOAuthState(value: string, secret: string): OAuthState {
  const [encodedState, signature] = value.split(".");

  if (!encodedState || !signature) {
    throw new Error("Invalid OAuth state");
  }

  const expectedSignature = signState(encodedState, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid OAuth state signature");
  }

  const parsed = JSON.parse(
    Buffer.from(encodedState, "base64url").toString("utf8")
  ) as OAuthState;

  if (
    !parsed.accountMappingId ||
    !parsed.nonce ||
    !isOAuthProvider(parsed.provider)
  ) {
    throw new Error("Invalid OAuth state payload");
  }

  return parsed;
}

export function toDirectConnectorConfig(
  provider: OAuthProvider,
  credentials: Record<string, string>
) {
  if (provider === "google_ads") {
    return pickCredentials(credentials, requiredCredentialFields.google_ads);
  }

  if (provider === "meta_ads") {
    return pickCredentials(credentials, requiredCredentialFields.meta_ads);
  }

  if (provider === "ga4") {
    if (credentials.clientEmail && credentials.privateKey) {
      return pickCredentials(credentials, [
        "propertyId",
        "clientEmail",
        "privateKey"
      ]);
    }

    return pickCredentials(credentials, requiredCredentialFields.ga4);
  }

  return pickCredentials(credentials, requiredCredentialFields.shopify);
}

export function validateCredentialFields(
  provider: OAuthProvider,
  credentials: Record<string, string>
) {
  const missing = requiredCredentialFields[provider].filter(
    (field) => !credentials[field]
  );

  if (provider === "ga4" && missing.length > 0) {
    const serviceAccountMissing = ["propertyId", "clientEmail", "privateKey"]
      .filter((field) => !credentials[field]);

    if (serviceAccountMissing.length === 0) {
      return [];
    }
  }

  return missing;
}

export function getOAuthClientConfig(
  provider: OAuthProvider,
  env: Record<string, string | undefined>
) {
  const definition = oauthProviders[provider];
  const clientId = env[definition.clientIdEnv];
  const clientSecret = env[definition.clientSecretEnv];

  return { clientId, clientSecret, definition };
}

function pickCredentials(
  credentials: Record<string, string>,
  fields: string[]
) {
  return Object.fromEntries(
    fields
      .filter((field) => credentials[field])
      .map((field) => [field, credentials[field]])
  );
}

function signState(encodedState: string, secret: string) {
  if (!secret) {
    throw new Error("OAuth state secret is required");
  }

  return createHmac("sha256", secret).update(encodedState).digest("base64url");
}

function requireShopDomain(value: string | undefined) {
  if (!value) {
    throw new Error("Shopify OAuth requires a shop domain");
  }

  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function isOAuthProvider(value: string): value is OAuthProvider {
  return (
    value === "google_ads" ||
    value === "meta_ads" ||
    value === "ga4" ||
    value === "shopify"
  );
}
