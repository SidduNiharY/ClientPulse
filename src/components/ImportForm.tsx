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

type ImportResult = {
  rowsImported: number;
  metricsAdded: number;
  metricsReplaced: number;
  warnings: string[];
  syncRunId: string;
  healthStatus: string;
};

const platformOptions = [
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "ga4", label: "GA4 / BigQuery revenue" },
  { value: "shopify", label: "Shopify" },
  { value: "manual", label: "Manual / BigQuery revenue" }
];

const sourceCards = [
  {
    platform: "google_ads",
    title: "Google Ads sheet script",
    columns: "Date, Campaign, Impressions, Clicks, Cost, Conversions, Conversion value"
  },
  {
    platform: "meta_ads",
    title: "Meta sheet script",
    columns: "date, campaign, impressions, clicks, spend, purchases, purchase_value, leads"
  },
  {
    platform: "shopify",
    title: "Shopify sheet script",
    columns: "date, channel, total_orders, total_revenue"
  }
];

const progressSteps = [
  { label: "Preparing import", progress: 18 },
  { label: "Reading Google Sheet", progress: 42 },
  { label: "Normalizing metrics", progress: 68 },
  { label: "Writing rows", progress: 88 }
];

export function ImportForm() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [mappings, setMappings] = useState<MappingOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [platform, setPlatform] = useState("google_ads");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const isHydrated = useHydrated();
  const selectedClient = clients.find((client) => client.id === clientId);
  const selectedMapping = useMemo(
    () => mappings.find((mapping) => mapping.platform === platform),
    [mappings, platform]
  );
  const selectedIngestionMethod = selectedMapping?.ingestionMethod ?? "google_sheets";
  const requiresCsv =
    selectedIngestionMethod === "csv_upload" ||
    selectedIngestionMethod === "platform_script" ||
    selectedIngestionMethod === "third_party_connector";
  const requiresBigQuery = selectedIngestionMethod === "bigquery";
  const requiresGoogleSheets = selectedIngestionMethod === "google_sheets";
  const defaultsToReplace =
    selectedIngestionMethod === "google_sheets" ||
    selectedIngestionMethod === "platform_script";
  const defaultImportMode = defaultsToReplace ? "replace" : "append";

  useEffect(() => {
    fetch("/api/clients")
      .then((response) => response.json())
      .then((data: ClientOption[] | { error?: string }) => {
        const nextClients = Array.isArray(data) ? data : [];

        setClients(nextClients);

        if (nextClients[0]) {
          setClientId(nextClients[0].id);
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
      .then((data: MappingOption[] | { error?: string }) =>
        setMappings(Array.isArray(data) ? data : [])
      )
      .catch(() => setMappings([]));
  }, [clientId]);

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgressStep((current) =>
        Math.min(current + 1, progressSteps.length - 1)
      );
    }, 900);

    return () => window.clearInterval(interval);
  }, [isSubmitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus(null);
    setError(null);
    setResult(null);

    const formData = new FormData(form);
    let mapping = selectedMapping ?? (await fetchSelectedMapping());

    if (!mapping && requiresGoogleSheets) {
      mapping = await createSheetMapping(formData);
    }

    if (!mapping) {
      setError("Add an account mapping for this platform before importing.");
      return;
    }

    const file = formData.get("csvFile");

    if (requiresCsv && !(file instanceof File)) {
      setError("Choose a CSV file to import.");
      return;
    }

    setIsSubmitting(true);
    setProgressStep(0);

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

      if (requiresGoogleSheets) {
        const sheetUrl = String(formData.get("sheetUrl") ?? "").trim();
        const range = String(formData.get("range") ?? "").trim();

        if (!sheetUrl) {
          throw new Error("Paste a Google Sheet sharing link before importing.");
        }

        connectorConfig.sheetUrl = sheetUrl;
        connectorConfig.sourceReference = sheetUrl;
        connectorConfig.publicCsv = "true";

        if (range) {
          connectorConfig.range = range;
        }
      }

      const mappingDefaultImportMode =
        mapping.ingestionMethod === "google_sheets" ||
        mapping.ingestionMethod === "platform_script"
          ? "replace"
          : "append";
      const submittedImportMode = String(formData.get("importMode") ?? "");
      const importMode =
        mappingDefaultImportMode === "replace" &&
        selectedIngestionMethod !== mapping.ingestionMethod &&
        submittedImportMode === "append"
          ? "replace"
          : submittedImportMode || mappingDefaultImportMode;
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
          importMode
        })
      });
      const importResult = (await response.json()) as Partial<ImportResult> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(importResult.error ?? "Import failed");
      }

      setResult({
        rowsImported: importResult.rowsImported ?? 0,
        metricsAdded: importResult.metricsAdded ?? 0,
        metricsReplaced: importResult.metricsReplaced ?? 0,
        warnings: importResult.warnings ?? [],
        syncRunId: importResult.syncRunId ?? "",
        healthStatus: importResult.healthStatus ?? "unknown"
      });
      setStatus(`Import completed (${importResult.rowsImported ?? 0} rows)`);
      form.reset();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Import failed"
      );
    } finally {
      setIsSubmitting(false);
      setProgressStep(0);
    }
  }

  return (
    <>
      <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold tracking-normal">
            Script and sheet imports
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pick a source template, confirm the mapped account, then import the
            selected date window.
          </p>
        </div>

        <div className="grid gap-3 lg:col-span-2 lg:grid-cols-3">
          {sourceCards.map((card) => {
            const mapping = mappings.find(
              (item) => item.platform === card.platform
            );
            const isSelected = platform === card.platform;

            return (
              <button
                aria-pressed={isSelected}
                className={[
                  "min-h-32 rounded-lg border p-4 text-left transition",
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--subtle)] shadow-[var(--shadow-soft)]"
                    : "border-[var(--border)] bg-[var(--field)] hover:bg-[var(--hover)]"
                ].join(" ")}
                key={card.platform}
                onClick={() => setPlatform(card.platform)}
                type="button"
              >
                <span className="text-xs font-semibold uppercase tracking-normal text-[var(--accent)]">
                  {mapping?.ingestionMethod ?? "script template"}
                </span>
                <span className="mt-2 block text-base font-semibold">
                  {card.title}
                </span>
                <span className="mt-3 block break-words font-mono text-xs leading-5 text-[var(--muted)]">
                  {card.columns}
                </span>
                <span className="mt-3 block text-xs text-[var(--muted)]">
                  {mapping ? mapping.accountName : "No mapping selected"}
                </span>
              </button>
            );
          })}
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

      {requiresGoogleSheets ? (
        <>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium" htmlFor="sheetUrl">
              Google Sheet link
            </label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              id="sheetUrl"
              name="sheetUrl"
              placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
              required={requiresGoogleSheets}
              type="url"
            />
            <p className="text-xs leading-5 text-[var(--muted)]">
              Share the sheet with link access or publish it through your
              script. The app reads the selected tab from the pasted link.
            </p>
          </div>

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
            <label className="text-sm font-medium" htmlFor="range">
              Optional range
            </label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              id="range"
              name="range"
              placeholder="Sheet1!A:Z"
              type="text"
            />
          </div>
        </>
      ) : null}

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

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="importMode">
          Import mode
        </label>
        <select
          className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          defaultValue={defaultImportMode}
          id="importMode"
          key={`import-mode-${selectedIngestionMethod ?? "none"}`}
          name="importMode"
        >
          <option value="replace">Replace matching dates</option>
          <option value="append">Append only</option>
        </select>
      </div>

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
      {isSubmitting ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--field)] p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold">
              {progressSteps[progressStep].label}
            </span>
            <span className="text-[var(--muted)]">
              {progressSteps[progressStep].progress}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${progressSteps[progressStep].progress}%` }}
            />
          </div>
        </div>
      ) : null}
      {result ? (
        <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--field)] p-4 lg:col-span-2 sm:grid-cols-2 lg:grid-cols-5">
          <ResultStat label="Rows imported" value={result.rowsImported} />
          <ResultStat label="Metrics added" value={result.metricsAdded} />
          <ResultStat
            label="Metrics replaced"
            value={result.metricsReplaced}
          />
          <ResultStat label="Health" value={result.healthStatus} />
          <ResultStat label="Sync run" value={result.syncRunId || "n/a"} />
          {result.warnings.length > 0 ? (
            <div className="rounded-md bg-[var(--signal-soft)] p-3 text-sm text-[var(--foreground)] sm:col-span-2 lg:col-span-5">
              <span className="font-semibold">Warnings: </span>
              {result.warnings.join(" | ")}
            </div>
          ) : null}
        </div>
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
    {isSubmitting ? (
      <div
        aria-modal="true"
        className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm"
        role="dialog"
      >
        <div className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-lift)]">
          <p className="text-sm font-semibold uppercase tracking-normal text-[var(--accent)]">
            Import running
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-normal">
            {progressSteps[progressStep].label}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            The app is reading the sheet, normalizing rows, and replacing the
            selected date window where the source is sheet-backed.
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${progressSteps[progressStep].progress}%` }}
            />
          </div>
        </div>
      </div>
    ) : null}
    </>
  );

  async function fetchSelectedMapping() {
    const response = await fetch(`/api/clients/${clientId}/mappings`);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as MappingOption[] | { error?: string };
    const refreshedMappings = Array.isArray(data) ? data : [];
    setMappings(refreshedMappings);

    return (
      refreshedMappings.find((mapping) => mapping.platform === platform) ?? null
    );
  }

  async function createSheetMapping(formData: FormData) {
    const sheetUrl = String(formData.get("sheetUrl") ?? "").trim();
    const dateField = String(formData.get("dateField") ?? "Date");
    const range = String(formData.get("range") ?? "").trim();
    const label =
      platformOptions.find((option) => option.value === platform)?.label ??
      platform;
    const response = await fetch(`/api/clients/${clientId}/mappings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountName: `${label} Google Sheet`,
        config: {
          dateField,
          range,
          sheetUrl,
          sourceReference: sheetUrl
        },
        fallbackMethod: "csv_upload",
        ingestionMethod: "google_sheets",
        platform,
        sourceAccountId: "google-sheet"
      })
    });

    if (!response.ok) {
      return null;
    }

    const created = (await response.json()) as MappingOption;
    setMappings((current) => [created, ...current]);

    return created;
  }
}

function ResultStat({
  label,
  value
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-normal text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold tracking-normal">
        {value}
      </p>
    </div>
  );
}
