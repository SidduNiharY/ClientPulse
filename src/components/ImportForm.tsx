"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useHydrated } from "./useHydrated";

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
  { value: "ga4", label: "GA4 / BigQuery revenue" },
  { value: "manual", label: "Manual / BigQuery revenue" }
];

export function ImportForm() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [mappings, setMappings] = useState<MappingOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [platform, setPlatform] = useState("google_ads");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useHydrated();
  const selectedClient = clients.find((client) => client.id === clientId);
  const selectedMapping = useMemo(
    () => mappings.find((mapping) => mapping.platform === platform),
    [mappings, platform]
  );
  const selectedIngestionMethod = selectedMapping?.ingestionMethod;
  const requiresCsv =
    selectedIngestionMethod === "csv_upload" ||
    selectedIngestionMethod === "platform_script" ||
    selectedIngestionMethod === "third_party_connector";
  const requiresBigQuery = selectedIngestionMethod === "bigquery";
  const requiresGoogleSheets = selectedIngestionMethod === "google_sheets";

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
    const form = event.currentTarget;
    setStatus(null);
    setError(null);

    const mapping = selectedMapping ?? (await fetchSelectedMapping());

    if (!mapping) {
      setError("Add an account mapping for this platform before importing.");
      return;
    }

    const formData = new FormData(form);
    const file = formData.get("csvFile");

    if (requiresCsv && !(file instanceof File)) {
      setError("Choose a CSV file to import.");
      return;
    }

    setIsSubmitting(true);

    try {
      const csv = file instanceof File ? await file.text() : "";
      const sourceReference =
        requiresBigQuery
          ? String(formData.get("sourceReference") ?? "")
          : file instanceof File
            ? file.name
            : `${mapping.accountName}:${mapping.ingestionMethod}`;
      const connectorConfig: Record<string, string> = {
        sourceReference,
        dateField: String(formData.get("dateField") ?? "Date"),
        currency: selectedClient?.currency ?? "INR"
      };

      if (csv) {
        connectorConfig.csv = csv;
      }

      if (requiresBigQuery) {
        connectorConfig.query = String(formData.get("bigQueryQuery") ?? "");

        const projectId = String(formData.get("projectId") ?? "");

        if (projectId) {
          connectorConfig.projectId = projectId;
        }
      }

      const response = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          accountMappingId: mapping.id,
          dateRange: {
            from: String(formData.get("dateFrom") ?? "2026-06-01"),
            to: String(formData.get("dateTo") ?? "2026-06-07")
          },
          connectorConfig,
          importMode: String(formData.get("importMode") ?? "append")
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
      form.reset();
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
          Run import
        </h2>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="importClient">
          Client
        </label>
        <select
          className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          id="importClient"
          onChange={(event) => {
            const nextClientId = event.target.value;

            if (nextClientId === clientId) {
              return;
            }

            setClientId(nextClientId);
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
          className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
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
          className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
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
          className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          defaultValue="2026-06-07"
          id="dateTo"
          name="dateTo"
          required
          type="date"
        />
      </div>

      {requiresBigQuery ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="projectId">
              BigQuery project ID
            </label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              id="projectId"
              name="projectId"
              placeholder="Uses BIGQUERY_PROJECT_ID if blank"
              type="text"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="sourceReference">
              Source reference
            </label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              id="sourceReference"
              name="sourceReference"
              placeholder="dataset.table"
              required
              type="text"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="dateField">
              Date field
            </label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              defaultValue={platform === "google_ads" ? "Date" : "date"}
              id="dateField"
              key={`bigquery-date-field-${platform}`}
              name="dateField"
              required
              type="text"
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium" htmlFor="bigQueryQuery">
              BigQuery SQL
            </label>
            <textarea
              className="min-h-32 w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--accent)]"
              id="bigQueryQuery"
              name="bigQueryQuery"
              required
            />
          </div>
        </>
      ) : null}

      {requiresGoogleSheets ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="dateField">
              Date field
            </label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              defaultValue="Date"
              id="dateField"
              key={`sheets-date-field-${platform}`}
              name="dateField"
              required
              type="text"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="importMode">
              Import mode
            </label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              defaultValue="replace"
              id="importMode"
              name="importMode"
            >
              <option value="replace">Replace matching dates</option>
              <option value="append">Append only</option>
            </select>
          </div>
        </>
      ) : null}

      {requiresCsv ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="dateField">
              Date field
            </label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              defaultValue={platform === "google_ads" ? "Date" : "date"}
              id="dateField"
              key={`csv-date-field-${platform}`}
              name="dateField"
              required
              type="text"
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium" htmlFor="csvFile">
              CSV file
            </label>
            <input
              accept=".csv,text/csv"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              id="csvFile"
              name="csvFile"
              required
              type="file"
            />
          </div>
        </>
      ) : null}

      {selectedMapping ? (
        <p className="text-sm text-[var(--muted)] lg:col-span-2">
          Importing through {selectedMapping.accountName} using{" "}
          {selectedMapping.ingestionMethod}.
        </p>
      ) : null}
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
          disabled={!isHydrated || isSubmitting || !clientId}
          type="submit"
        >
          {isSubmitting ? "Importing..." : "Run import"}
        </button>
      </div>
    </form>
  );

  async function fetchSelectedMapping() {
    const response = await fetch(`/api/clients/${clientId}/mappings`);

    if (!response.ok) {
      return null;
    }

    const refreshedMappings = (await response.json()) as MappingOption[];
    setMappings(refreshedMappings);

    return (
      refreshedMappings.find((mapping) => mapping.platform === platform) ?? null
    );
  }
}
