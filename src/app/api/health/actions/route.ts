import { NextResponse } from "next/server";
import { z } from "zod";
import {
  defaultImportModeFor,
  ImportRunError,
  runImport
} from "@/server/imports/runImport";
import { db } from "@/server/db/client";

const supportedImportMethods = [
  "google_sheets",
  "platform_script",
  "bigquery",
  "csv_upload"
] as const;

const healthActionSchema = z.object({
  action: z.enum(["retry_sync", "switch_fallback", "resolve_issue"]),
  accountMappingId: z.string().min(1),
  connectorId: z.string().min(1).optional()
});

type SupportedImportMethod = (typeof supportedImportMethods)[number];

function isSupportedImportMethod(value: string): value is SupportedImportMethod {
  return supportedImportMethods.some((method) => method === value);
}

function recentDateWindow() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 30);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10)
  };
}

async function loadMapping(accountMappingId: string) {
  return db.accountMapping.findUnique({
    where: { id: accountMappingId },
    select: {
      id: true,
      clientId: true,
      ingestionMethod: true,
      fallbackMethod: true
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = healthActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid health action payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { action, accountMappingId, connectorId } = parsed.data;
  const mapping = await loadMapping(accountMappingId);

  if (!mapping) {
    return NextResponse.json(
      { error: "Account mapping was not found" },
      { status: 404 }
    );
  }

  if (action === "retry_sync") {
    if (!isSupportedImportMethod(mapping.ingestionMethod)) {
      return NextResponse.json(
        {
          error:
            "Retry is only available for Google Sheets, platform script, BigQuery, and CSV upload sources."
        },
        { status: 422 }
      );
    }

    const dateRange = recentDateWindow();

    try {
      const result = await runImport({
        clientId: mapping.clientId,
        accountMappingId: mapping.id,
        dateRange,
        importMode: defaultImportModeFor(mapping.ingestionMethod)
      });

      return NextResponse.json({
        action,
        message: `Retry completed for ${dateRange.from} to ${dateRange.to}.`,
        dateRange,
        result
      });
    } catch (error) {
      if (error instanceof ImportRunError) {
        return NextResponse.json(
          {
            action,
            error: error.message,
            message: `Retry failed for ${dateRange.from} to ${dateRange.to}.`,
            dateRange,
            result: error.result
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          action,
          error: error instanceof Error ? error.message : "Retry failed",
          message: `Retry failed for ${dateRange.from} to ${dateRange.to}.`,
          dateRange
        },
        { status: 500 }
      );
    }
  }

  if (action === "switch_fallback") {
    if (!mapping.fallbackMethod) {
      return NextResponse.json(
        {
          error: "No fallback source is configured for this mapping."
        },
        { status: 409 }
      );
    }

    if (!isSupportedImportMethod(mapping.fallbackMethod)) {
      return NextResponse.json(
        {
          error:
            "Fallback source is not supported. Use Google Sheets, platform script, BigQuery, or CSV upload."
        },
        { status: 422 }
      );
    }

    const updated = await db.accountMapping.update({
      where: { id: mapping.id },
      data: {
        ingestionMethod: mapping.fallbackMethod,
        fallbackMethod: isSupportedImportMethod(mapping.ingestionMethod)
          ? mapping.ingestionMethod
          : null
      },
      select: {
        id: true,
        ingestionMethod: true,
        fallbackMethod: true
      }
    });

    return NextResponse.json({
      action,
      message: `Fallback switched to ${updated.ingestionMethod}.`,
      mapping: updated
    });
  }

  if (!connectorId) {
    return NextResponse.json(
      { error: "connectorId is required to resolve an issue." },
      { status: 400 }
    );
  }

  const updated = await db.connector.updateMany({
    where: {
      id: connectorId,
      accountMappingId: mapping.id
    },
    data: {
      healthStatus: "healthy",
      latestError: null,
      lastFailedSync: null
    }
  });

  if (updated.count === 0) {
    return NextResponse.json(
      { error: "Connector was not found for this mapping." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    action,
    message: "Issue marked as resolved."
  });
}
