"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type HealthActionControlsProps = {
  accountMappingId: string;
  connectorId: string | null;
  canSwitchFallback: boolean;
};

type HealthAction = "retry_sync" | "switch_fallback" | "resolve_issue";

async function runHealthAction(input: {
  action: HealthAction;
  accountMappingId: string;
  connectorId: string | null;
}) {
  const response = await fetch("/api/health/actions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: input.action,
      accountMappingId: input.accountMappingId,
      connectorId: input.connectorId ?? undefined
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? payload.message ?? "Health action failed");
  }

  return payload.message ?? "Action completed.";
}

export function HealthActionControls({
  accountMappingId,
  connectorId,
  canSwitchFallback
}: HealthActionControlsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function trigger(action: HealthAction) {
    setStatus(null);
    setIsPending(true);

    try {
      const message = await runHealthAction({
        action,
        accountMappingId,
        connectorId
      });
      setStatus(message);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Action failed");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-w-[220px] space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          onClick={() => trigger("retry_sync")}
          type="button"
        >
          Retry
        </button>
        <button
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || !canSwitchFallback}
          onClick={() => trigger("switch_fallback")}
          title={
            canSwitchFallback
              ? "Switch to the configured fallback source"
              : "No fallback source is configured"
          }
          type="button"
        >
          Switch fallback
        </button>
        <button
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || !connectorId}
          onClick={() => trigger("resolve_issue")}
          type="button"
        >
          Resolve
        </button>
      </div>
      {status ? (
        <p aria-live="polite" className="text-xs text-[var(--muted)]">
          {status}
        </p>
      ) : null}
    </div>
  );
}
