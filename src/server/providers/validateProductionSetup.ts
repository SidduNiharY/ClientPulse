import { existsSync } from "node:fs";
import { join } from "node:path";

export type ProviderReadiness = {
  id: "email" | "whatsapp" | "ai" | "scheduled_sync";
  label: string;
  status: "ready" | "missing" | "optional";
  detail: string;
};

function hasAll(keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]));
}

export function validateProductionSetup(): ProviderReadiness[] {
  const scheduledSyncScriptExists = existsSync(
    join(process.cwd(), "scripts/run-scheduled-sync.ts")
  );

  return [
    {
      id: "email",
      label: "Email delivery",
      status: hasAll([
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASS",
        "SMTP_FROM"
      ])
        ? "ready"
        : "missing",
      detail: "Requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM."
    },
    {
      id: "whatsapp",
      label: "WhatsApp delivery",
      status: process.env.WHATSAPP_API_URL ? "ready" : "optional",
      detail: "Requires WHATSAPP_API_URL when WhatsApp sending is enabled."
    },
    {
      id: "ai",
      label: "AI insights",
      status:
        process.env.AI_PROVIDER && process.env.AI_API_KEY ? "ready" : "optional",
      detail: "Falls back to rule-based insights unless AI_PROVIDER and AI_API_KEY are set."
    },
    {
      id: "scheduled_sync",
      label: "Scheduled sync",
      status: scheduledSyncScriptExists ? "ready" : "missing",
      detail: "Run with npm run sync:scheduled from cron or a scheduler."
    }
  ];
}
