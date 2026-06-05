"use client";

import { FormEvent, useState } from "react";
import { useHydrated } from "./useHydrated";

export type AccountMappingItem = {
  id: string;
  platform: string;
  accountName: string;
  sourceAccountId: string;
  ingestionMethod: string;
  fallbackMethod?: string | null;
  isActive: boolean;
  createdAt?: string;
};

const platformOptions = [
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "ga4", label: "GA4" },
  { value: "shopify", label: "Shopify" },
  { value: "manual", label: "Manual fallback" }
];

const ingestionOptions = [
  { value: "csv_upload", label: "CSV upload" },
  { value: "google_sheets", label: "Google Sheets" },
  { value: "bigquery", label: "BigQuery" },
  { value: "platform_script", label: "Platform script" },
  { value: "direct_api", label: "Direct API" },
  { value: "third_party_connector", label: "Third-party connector" }
];

export function AccountMappingForm({
  clientId,
  initialMappings
}: {
  clientId: string;
  initialMappings: AccountMappingItem[];
}) {
  const [mappings, setMappings] =
    useState<AccountMappingItem[]>(initialMappings);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      platform: String(formData.get("platform") ?? "google_ads"),
      accountName: String(formData.get("accountName") ?? ""),
      sourceAccountId: String(formData.get("sourceAccountId") ?? ""),
      ingestionMethod: String(formData.get("ingestionMethod") ?? "csv_upload"),
      fallbackMethod: String(formData.get("fallbackMethod") ?? "csv_upload"),
      config: {
        dateField: String(formData.get("dateField") ?? "Date")
      }
    };

    try {
      const response = await fetch(`/api/clients/${clientId}/mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not add account mapping");
      }

      const mapping = (await response.json()) as AccountMappingItem;
      setMappings((current) => [mapping, ...current]);
      event.currentTarget.reset();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not add account mapping"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form
        className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
        onSubmit={handleSubmit}
      >
        <div>
          <h2 className="text-lg font-semibold tracking-normal">
            Add mapping
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Map Google Ads, Meta Ads, GA4, Shopify, or manual fallback data.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="platform">
            Platform
          </label>
          <select
            className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            id="platform"
            name="platform"
          >
            {platformOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="accountName">
            Account name
          </label>
          <input
            className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            id="accountName"
            name="accountName"
            required
            type="text"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="sourceAccountId">
            Source account ID
          </label>
          <input
            className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            id="sourceAccountId"
            name="sourceAccountId"
            required
            type="text"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ingestionMethod">
            Ingestion method
          </label>
          <select
            className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            defaultValue="csv_upload"
            id="ingestionMethod"
            name="ingestionMethod"
          >
            {ingestionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="fallbackMethod">
            Fallback method
          </label>
          <select
            className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            defaultValue="csv_upload"
            id="fallbackMethod"
            name="fallbackMethod"
          >
            {ingestionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="dateField">
            Date field
          </label>
          <input
            className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            defaultValue="Date"
            id="dateField"
            name="dateField"
            required
            type="text"
          />
        </div>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        <button
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isHydrated || isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Adding..." : "Add mapping"}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--subtle)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 font-semibold">Account</th>
              <th className="px-4 py-3 font-semibold">Source ID</th>
              <th className="px-4 py-3 font-semibold">Method</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {mappings.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={5}>
                  No account mappings have been added yet.
                </td>
              </tr>
            ) : (
              mappings.map((mapping) => (
                <tr
                  className="border-b border-[var(--border)] last:border-b-0"
                  key={mapping.id}
                >
                  <td className="px-4 py-3">{mapping.platform}</td>
                  <td className="px-4 py-3 font-medium">
                    {mapping.accountName}
                  </td>
                  <td className="px-4 py-3">{mapping.sourceAccountId}</td>
                  <td className="px-4 py-3">{mapping.ingestionMethod}</td>
                  <td className="px-4 py-3">
                    {mapping.isActive ? "Active" : "Inactive"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
