"use client";

import { useState } from "react";
import { useHydrated } from "./useHydrated";

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ReportActions({
  reportId,
  initialStatus
}: {
  reportId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const isHydrated = useHydrated();

  async function approveReport() {
    setError(null);
    setIsApproving(true);

    try {
      const response = await fetch(`/api/reports/${reportId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo_user",
          confirmPoorQuality: true
        })
      });
      const result = (await response.json()) as {
        status?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not approve report");
      }

      setStatus(result.status ?? "approved");
    } catch (approvalError) {
      setError(
        approvalError instanceof Error
          ? approvalError.message
          : "Could not approve report"
      );
    } finally {
      setIsApproving(false);
    }
  }

  async function sendReport(method: "email" | "whatsapp") {
    setError(null);

    if (method === "email") {
      setIsSendingEmail(true);
    } else {
      setIsSendingWhatsApp(true);
    }

    try {
      const response = await fetch(`/api/reports/${reportId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method })
      });
      const result = (await response.json()) as {
        status?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not send report");
      }

      setStatus(result.status ?? "sent");
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Could not send report"
      );
    } finally {
      if (method === "email") {
        setIsSendingEmail(false);
      } else {
        setIsSendingWhatsApp(false);
      }
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div>
        <p className="text-sm text-[var(--muted)]">Approval status</p>
        <p className="mt-1 text-lg font-semibold">{formatStatus(status)}</p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#066b5f] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={
            !isHydrated ||
            isApproving ||
            status === "approved" ||
            status === "sent"
          }
          onClick={approveReport}
          type="button"
        >
          {isApproving ? "Approving..." : "Approve"}
        </button>
        <button
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-[#eef4f1] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isHydrated || isSendingEmail || status !== "approved"}
          onClick={() => sendReport("email")}
          type="button"
        >
          {isSendingEmail ? "Sending..." : "Send email"}
        </button>
        <button
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-[#eef4f1] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isHydrated || isSendingWhatsApp || status !== "approved"}
          onClick={() => sendReport("whatsapp")}
          type="button"
        >
          {isSendingWhatsApp ? "Sending..." : "Send WhatsApp"}
        </button>
      </div>
    </div>
  );
}
