"use client";

import { FormEvent, useMemo, useState } from "react";
import { useHydrated } from "./useHydrated";

type Provider = "google_ads" | "meta_ads" | "ga4" | "shopify";

export type DirectMappingOption = {
  id: string;
  provider: Provider;
  label: string;
};

const providerOptions: Array<{ provider: Provider; label: string }> = [
  { provider: "google_ads", label: "Google Ads" },
  { provider: "meta_ads", label: "Meta Ads" },
  { provider: "ga4", label: "GA4" },
  { provider: "shopify", label: "Shopify" }
];

const fieldOptions: Record<
  Provider,
  Array<{ name: string; label: string; type?: string }>
> = {
  google_ads: [
    { name: "developerToken", label: "Developer token" },
    { name: "oauthClientId", label: "OAuth client ID" },
    { name: "oauthClientSecret", label: "OAuth client secret", type: "password" },
    { name: "refreshToken", label: "Refresh token", type: "password" },
    { name: "loginCustomerId", label: "MCC login customer ID" }
  ],
  meta_ads: [
    { name: "accessToken", label: "Access token", type: "password" },
    { name: "adAccountId", label: "Ad account ID" }
  ],
  ga4: [
    { name: "propertyId", label: "GA4 property ID" },
    { name: "oauthClientId", label: "OAuth client ID" },
    { name: "oauthClientSecret", label: "OAuth client secret", type: "password" },
    { name: "refreshToken", label: "Refresh token", type: "password" },
    { name: "clientEmail", label: "Service account email" },
    { name: "privateKey", label: "Service account private key", type: "password" }
  ],
  shopify: [
    { name: "storeDomain", label: "Store domain" },
    { name: "accessToken", label: "Admin API access token", type: "password" }
  ]
};

export function ConnectionCredentialForm({
  mappings
}: {
  mappings: DirectMappingOption[];
}) {
  const isHydrated = useHydrated();
  const [provider, setProvider] = useState<Provider>("google_ads");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const providerMappings = useMemo(
    () => mappings.filter((mapping) => mapping.provider === provider),
    [mappings, provider]
  );
  const fields = fieldOptions[provider];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const credentials = Object.fromEntries(
      fields
        .map((field) => [field.name, String(formData.get(field.name) ?? "")])
        .filter(([, value]) => value)
    );

    try {
      const response = await fetch("/api/connections/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          accountMappingId: String(formData.get("accountMappingId") ?? ""),
          credentials
        })
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not save credentials");
      }

      setStatus(result.message ?? "Credentials saved.");
      event.currentTarget.reset();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not save credentials"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 lg:grid-cols-2"
      onSubmit={handleSubmit}
    >
      <div className="lg:col-span-2">
        <h2 className="text-lg font-semibold tracking-normal">
          Save direct credentials
        </h2>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="connectionProvider">
          Provider
        </label>
        <select
          className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          id="connectionProvider"
          onChange={(event) => setProvider(event.target.value as Provider)}
          value={provider}
        >
          {providerOptions.map((option) => (
            <option key={option.provider} value={option.provider}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="accountMappingId">
          Account mapping
        </label>
        <select
          className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          id="accountMappingId"
          name="accountMappingId"
          required
        >
          <option value="">Select mapping</option>
          {providerMappings.map((mapping) => (
            <option key={mapping.id} value={mapping.id}>
              {mapping.label}
            </option>
          ))}
        </select>
      </div>

      {fields.map((field) => (
        <div className="space-y-2" key={field.name}>
          <label className="text-sm font-medium" htmlFor={field.name}>
            {field.label}
          </label>
          <input
            className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            id={field.name}
            name={field.name}
            type={field.type ?? "text"}
          />
        </div>
      ))}

      {status ? (
        <p className="text-sm font-medium text-[var(--accent)] lg:col-span-2">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--danger)] lg:col-span-2">{error}</p>
      ) : null}

      <div className="lg:col-span-2">
        <button
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isHydrated || isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Saving..." : "Save credentials"}
        </button>
      </div>
    </form>
  );
}
