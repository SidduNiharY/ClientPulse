"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMonthlyRange,
  getWeeklyRange
} from "@/server/reporting/dateRanges";
import { useHydrated } from "@/components/useHydrated";

type ClientOption = {
  id: string;
  name: string;
};

export default function NewReportPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useHydrated();

  useEffect(() => {
    fetch("/api/clients")
      .then((response) => response.json())
      .then((data: ClientOption[]) => setClients(data))
      .catch(() => setClients([]));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const reportType = String(formData.get("reportType") ?? "weekly") as
      | "weekly"
      | "monthly";
    const selectedDate = String(formData.get("selectedDate") ?? "");
    const dateRange =
      reportType === "weekly"
        ? getWeeklyRange(selectedDate)
        : getMonthlyRange(selectedDate);
    const payload = {
      clientId: String(formData.get("clientId") ?? ""),
      reportType,
      dateRange,
      adSource: String(formData.get("adSource") ?? "google_ads"),
      revenueSource: String(formData.get("revenueSource") ?? "ga4")
    };

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not generate report draft");
      }

      const report = (await response.json()) as { id: string };
      router.push(`/reports/${report.id}`);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not generate report draft"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
          Report Setup
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Generate report draft
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form
          className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="clientId">
              Client
            </label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              id="clientId"
              name="clientId"
              required
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
            <label className="text-sm font-medium" htmlFor="reportType">
              Report type
            </label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              defaultValue="weekly"
              id="reportType"
              name="reportType"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="selectedDate">
              Report date
            </label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              defaultValue="2026-06-04"
              id="selectedDate"
              name="selectedDate"
              required
              type="date"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="adSource">
              Ad source
            </label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              defaultValue="google_ads"
              id="adSource"
              name="adSource"
            >
              <option value="google_ads">Google Ads</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="revenueSource">
              Revenue source
            </label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              defaultValue="ga4"
              id="revenueSource"
              name="revenueSource"
            >
              <option value="ga4">GA4</option>
              <option value="google_ads_conversion_value">
                Google Ads conversion value
              </option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <button
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isHydrated || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Generating..." : "Generate draft"}
          </button>
        </form>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold tracking-normal">
            Health pre-check summary
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-[var(--border)] p-4">
              <p className="text-sm text-[var(--muted)]">Connector status</p>
              <p className="mt-2 font-semibold">Review health page</p>
            </div>
            <div className="rounded-md border border-[var(--border)] p-4">
              <p className="text-sm text-[var(--muted)]">Approval state</p>
              <p className="mt-2 font-semibold">Draft required</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
