"use client";

import { useState } from "react";
import { useHydrated } from "./useHydrated";

type EditableInsight = {
  id: string;
  insightType: string;
  text: string;
};

type EditableEmailDraft = {
  subject: string;
  body: string;
};

export function ReportEditForm({
  reportId,
  insights,
  emailDraft
}: {
  reportId: string;
  insights: EditableInsight[];
  emailDraft: EditableEmailDraft;
}) {
  const [editedInsights, setEditedInsights] = useState(
    insights.map((insight) => ({ id: insight.id, text: insight.text }))
  );
  const [subject, setSubject] = useState(emailDraft.subject);
  const [body, setBody] = useState(emailDraft.body);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isHydrated = useHydrated();

  async function saveEdits() {
    setStatus(null);
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/reports/${reportId}/edits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insights: editedInsights,
          emailDraft: {
            subject,
            body
          }
        })
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not save report edits");
      }

      setStatus("Report edits saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save report edits"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-normal">
            Client-facing edits
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Save the summary language before approval or delivery.
          </p>
        </div>
        <button
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isHydrated || isSaving}
          onClick={saveEdits}
          type="button"
        >
          {isSaving ? "Saving..." : "Save edits"}
        </button>
      </div>

      {status ? (
        <p className="mt-4 text-sm font-medium text-[var(--accent)]">{status}</p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="mt-5 space-y-4">
        {insights.map((insight, index) => (
          <label className="block space-y-2" key={insight.id}>
            <span className="text-sm font-medium">
              {formatInsightLabel(insight.insightType)}
            </span>
            <textarea
              aria-label={formatInsightLabel(insight.insightType)}
              className="min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--field)] p-3 text-sm"
              onChange={(event) => {
                const nextInsights = [...editedInsights];
                nextInsights[index] = {
                  id: insight.id,
                  text: event.target.value
                };
                setEditedInsights(nextInsights);
              }}
              value={editedInsights[index]?.text ?? ""}
            />
          </label>
        ))}

        <label className="block space-y-2">
          <span className="text-sm font-medium">Email subject</span>
          <input
            aria-label="Email subject"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--field)] px-3 py-2 text-sm"
            onChange={(event) => setSubject(event.target.value)}
            value={subject}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Email body</span>
          <textarea
            aria-label="Email body"
            className="min-h-32 w-full rounded-md border border-[var(--border)] bg-[var(--field)] p-3 text-sm"
            onChange={(event) => setBody(event.target.value)}
            value={body}
          />
        </label>
      </div>
    </section>
  );
}

function formatInsightLabel(insightType: string) {
  return insightType
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
