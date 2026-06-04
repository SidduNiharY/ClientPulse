"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

export type ClientListItem = {
  id: string;
  name: string;
  clientType: string;
  primaryEmail: string;
  currency: string;
  createdAt?: string;
};

function formatDate(value: string | undefined) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function ClientForm({
  initialClients
}: {
  initialClients: ClientListItem[];
}) {
  const [clients, setClients] = useState<ClientListItem[]>(initialClients);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sortedClients = useMemo(() => clients, [clients]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      clientType: String(formData.get("clientType") ?? "ecommerce"),
      primaryEmail: String(formData.get("primaryEmail") ?? ""),
      currency: String(formData.get("currency") ?? "INR")
    };

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not create client");
      }

      const client = (await response.json()) as ClientListItem;
      setClients((current) => [client, ...current]);
      event.currentTarget.reset();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not create client"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form
        className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
        onSubmit={handleSubmit}
      >
        <div>
          <h2 className="text-lg font-semibold tracking-normal">
            Add client
          </h2>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Client name
          </label>
          <input
            className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            id="name"
            name="name"
            required
            type="text"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="clientType">
            Client type
          </label>
          <select
            className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            defaultValue="ecommerce"
            id="clientType"
            name="clientType"
          >
            <option value="ecommerce">Ecommerce</option>
            <option value="lead_generation">Lead generation</option>
            <option value="marketplace">Marketplace</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="primaryEmail">
            Primary email
          </label>
          <input
            className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            id="primaryEmail"
            name="primaryEmail"
            required
            type="email"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="currency">
            Currency
          </label>
          <input
            className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm uppercase outline-none focus:border-[var(--accent)]"
            defaultValue="INR"
            id="currency"
            maxLength={3}
            minLength={3}
            name="currency"
            required
            type="text"
          />
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#066b5f] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Creating..." : "Create client"}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[#eef4f1] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Client name</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Currency</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {sortedClients.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={5}>
                  No clients have been added yet.
                </td>
              </tr>
            ) : (
              sortedClients.map((client) => (
                <tr
                  className="border-b border-[var(--border)] last:border-b-0"
                  key={client.id}
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      className="text-[var(--accent)] hover:underline"
                      href={`/clients/${client.id}`}
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{client.clientType}</td>
                  <td className="px-4 py-3">{client.primaryEmail}</td>
                  <td className="px-4 py-3">{client.currency}</td>
                  <td className="px-4 py-3">{formatDate(client.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
