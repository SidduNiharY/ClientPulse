"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ClientOption = {
  id: string;
  name: string;
  currency?: string;
};

type MappingOption = {
  id: string;
  platform: string;
  accountName: string;
  ingestionMethod: string;
};

const platformOptions = [
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "shopify", label: "Shopify" }
];

export function ImportForm() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [mappings, setMappings] = useState<MappingOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [platform, setPlatform] = useState("google_ads");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedClient = clients.find((client) => client.id === clientId);
  const selectedMapping = useMemo(
    () => mappings.find((mapping) => mapping.platform === platform),
    [mappings, platform]
  );

  useEffect(() => {
    fetch("/api/clients")
      .then((response) => response.json())
      .then((data: ClientOption[]) => {
        setClients(data);

        if (data[0]) {
          setClientId(data[0].id);
        }
      })
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    fetch(`/api/clients/${clientId}/mappings`)
      .then((response) => response.json())
      .then((data: MappingOption[]) => setMappings(data))
      .catch(() => setMappings([]));
  }, [clientId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);

    if (!selectedMapping) {
      setError("Add an account mapping for this platform before importing.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const file = formData.get("csvFile");

    if (!(file instanceof File)) {
      setError("Choose a CSV file to import.");
      return;
    }

    setIsSubmitting(true);

    try {
      const csv = await file.text();
      const response = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          accountMappingId: selectedMapping.id,
          dateRange: {
            from: String(formData.get("dateFrom") ?? "2026-06-01"),
            to: String(formData.get("dateTo") ?? "2026-06-07")
          },
          connectorConfig: {
            csv,
            sourceReference: file.name,
            dateField: platform === "google_ads" ? "Date" : "date",
            currency: selectedClient?.currency ?? "INR"
          }
        })
      });
      const result = (await response.json()) as {
        rowsImported?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Import failed");
      }

      setStatus(`Import completed (${result.rowsImported ?? 0} rows)`);
      event.currentTarget.reset();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Import failed"
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
          Run CSV import
        </h2>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="importClient">
          Client
        </label>
        <select
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          id="importClient"
          onChange={(event) => {
            setClientId(event.target.value);
            setMappings([]);
          }}
          required
          value={clientId}
        >
          <option value="">Select client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="importPlatform">
          Platform
        </label>
        <select
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          id="importPlatform"
          onChange={(event) => setPlatform(event.target.value)}
          value={platform}
        >
          {platformOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="dateFrom">
          Date from
        </label>
        <input
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          defaultValue="2026-06-01"
          id="dateFrom"
          name="dateFrom"
          required
          type="date"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="dateTo">
          Date to
        </label>
        <input
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          defaultValue="2026-06-07"
          id="dateTo"
          name="dateTo"
          required
          type="date"
        />
      </div>

      <div className="space-y-2 lg:col-span-2">
        <label className="text-sm font-medium" htmlFor="csvFile">
          CSV file
        </label>
        <input
          accept=".csv,text/csv"
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          id="csvFile"
          name="csvFile"
          required
          type="file"
        />
      </div>

      {selectedMapping ? (
        <p className="text-sm text-[var(--muted)] lg:col-span-2">
          Importing through {selectedMapping.accountName}.
        </p>
      ) : null}
      {status ? (
        <p className="text-sm font-medium text-[var(--accent)] lg:col-span-2">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700 lg:col-span-2">{error}</p>
      ) : null}

      <div className="lg:col-span-2">
        <button
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#066b5f] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Importing..." : "Run import"}
        </button>
      </div>
    </form>
  );
}
