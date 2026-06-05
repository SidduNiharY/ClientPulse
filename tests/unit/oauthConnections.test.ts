import {
  buildOAuthAuthorizationUrl,
  createSignedOAuthState,
  parseSignedOAuthState,
  requiredCredentialFields,
  toDirectConnectorConfig
} from "@/server/connections/oauth";
import {
  decryptCredentialPayload,
  encryptCredentialPayload
} from "@/server/connections/credentialCrypto";
import { describe, expect, it } from "vitest";

describe("OAuth connection helpers", () => {
  it("builds a Google Ads authorization URL with offline access and signed state", () => {
    const url = buildOAuthAuthorizationUrl({
      provider: "google_ads",
      accountMappingId: "mapping_1",
      origin: "https://reports.example.com",
      clientId: "google-client",
      stateSecret: "state-secret",
      nonce: "nonce_1"
    });

    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );
    expect(url.searchParams.get("client_id")).toBe("google-client");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toContain(
      "https://www.googleapis.com/auth/adwords"
    );
    expect(
      parseSignedOAuthState(
        url.searchParams.get("state") ?? "",
        "state-secret"
      )
    ).toMatchObject({
      provider: "google_ads",
      accountMappingId: "mapping_1",
      nonce: "nonce_1"
    });
  });

  it("builds a Shopify authorization URL against the mapped shop domain", () => {
    const url = buildOAuthAuthorizationUrl({
      provider: "shopify",
      accountMappingId: "mapping_2",
      origin: "https://reports.example.com",
      clientId: "shopify-client",
      stateSecret: "state-secret",
      nonce: "nonce_2",
      shopDomain: "demo-store.myshopify.com"
    });

    expect(url.origin + url.pathname).toBe(
      "https://demo-store.myshopify.com/admin/oauth/authorize"
    );
    expect(url.searchParams.get("scope")).toBe("read_orders,read_products");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://reports.example.com/api/connections/oauth"
    );
  });

  it("rejects tampered OAuth state", () => {
    const state = createSignedOAuthState(
      {
        provider: "meta_ads",
        accountMappingId: "mapping_3",
        nonce: "nonce_3"
      },
      "state-secret"
    );

    expect(() =>
      parseSignedOAuthState(`${state}tampered`, "state-secret")
    ).toThrow("Invalid OAuth state signature");
  });

  it("encrypts credential payloads and maps them into direct connector config", () => {
    const encrypted = encryptCredentialPayload(
      {
        refreshToken: "refresh",
        developerToken: "developer-token",
        oauthClientId: "client-id",
        oauthClientSecret: "client-secret",
        loginCustomerId: "1234567890"
      },
      "encryption-secret"
    );
    const decrypted = decryptCredentialPayload(encrypted, "encryption-secret");

    expect(encrypted).not.toContain("developer-token");
    expect(
      toDirectConnectorConfig("google_ads", decrypted)
    ).toMatchObject({
      refreshToken: "refresh",
      developerToken: "developer-token",
      oauthClientId: "client-id",
      oauthClientSecret: "client-secret",
      loginCustomerId: "1234567890"
    });
  });

  it("lists required manual credential fields by provider", () => {
    expect(requiredCredentialFields.google_ads).toContain("developerToken");
    expect(requiredCredentialFields.meta_ads).toEqual([
      "accessToken",
      "adAccountId"
    ]);
    expect(requiredCredentialFields.ga4).toContain("propertyId");
    expect(requiredCredentialFields.shopify).toEqual([
      "storeDomain",
      "accessToken"
    ]);
  });
});
