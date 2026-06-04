import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { BigQueryConnector } from "@/server/connectors/bigQueryConnector";
import { CsvConnector } from "@/server/connectors/csvConnector";
import { NeedsAuthorizationConnector } from "@/server/connectors/directStubs";
import { GoogleSheetsConnector } from "@/server/connectors/googleSheetsConnector";
import type { Connector, IngestionMethod } from "@/server/connectors/types";
import { db } from "@/server/db/client";
import { runDemoImport } from "@/server/demo/memoryStore";

const importRequestSchema = z.object({
  clientId: z.string().min(1),
  accountMappingId: z.string().min(1),
  dateRange: z.object({
    from: z.string().min(1),
    to: z.string().min(1)
  }),
  connectorConfig: z.record(z.string(), z.string()).default({})
});

function createConnector(ingestionMethod: IngestionMethod): Connector {
  if (ingestionMethod === "csv_upload" || ingestionMethod === "platform_script") {
    return new CsvConnector();
  }

  if (ingestionMethod === "google_sheets") {
    return new GoogleSheetsConnector();
  }

  if (ingestionMethod === "bigquery") {
    return new BigQueryConnector();
  }

  return new NeedsAuthorizationConnector(ingestionMethod);
}

function jsonConfigToRecord(value: Prisma.JsonValue): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, configValue]) => [key, String(configValue)])
  );
}

async function updateConnectorHealth(input: {
  accountMappingId: string;
  connectorType: string;
  healthStatus: "healthy" | "failed";
  rowsImported?: number;
  latestError?: string;
}) {
  const data =
    input.healthStatus === "healthy"
      ? {
          healthStatus: input.healthStatus,
          lastSuccessfulSync: new Date(),
          latestError: null,
          rowsImported: input.rowsImported ?? 0
        }
      : {
          healthStatus: input.healthStatus,
          lastFailedSync: new Date(),
          latestError: input.latestError ?? "Import failed"
        };

  const updated = await db.connector.updateMany({
    where: {
      accountMappingId: input.accountMappingId,
      connectorType: input.connectorType
    },
    data
  });

  if (updated.count === 0) {
    await db.connector.create({
      data: {
        accountMappingId: input.accountMappingId,
        connectorType: input.connectorType,
        ...data
      }
    });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = importRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid import payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const input = parsed.data;
  let syncRunId: string | null = null;
  let connectorType: IngestionMethod | null = null;

  try {
    const accountMapping = await db.accountMapping.findUniqueOrThrow({
      where: { id: input.accountMappingId },
      select: {
        id: true,
        platform: true,
        ingestionMethod: true,
        sourceAccountId: true,
        config: true
      }
    });
    const syncRun = await db.syncRun.create({
      data: {
        clientId: input.clientId,
        accountMappingId: input.accountMappingId,
        platform: accountMapping.platform,
        ingestionMethod: accountMapping.ingestionMethod,
        dateFrom: new Date(input.dateRange.from),
        dateTo: new Date(input.dateRange.to),
        status: "running"
      }
    });
    syncRunId = syncRun.id;
    connectorType = accountMapping.ingestionMethod;

    const connector = createConnector(accountMapping.ingestionMethod);
    const connectorConfig = {
      ...jsonConfigToRecord(accountMapping.config),
      ...input.connectorConfig,
      platform: accountMapping.platform,
      sourceAccountId: accountMapping.sourceAccountId,
      syncRunId: syncRun.id
    };
    const result = await connector.fetch({
      clientId: input.clientId,
      accountMappingId: input.accountMappingId,
      dateRange: input.dateRange,
      config: connectorConfig
    });

    await db.$transaction([
      db.rawSourceRow.createMany({
        data: result.rows.map((row) => ({
          syncRunId: syncRun.id,
          sourceReference: row.sourceTrace.sourceReference,
          sourcePayload: row as unknown as Prisma.InputJsonObject
        }))
      }),
      db.metricRow.createMany({
        data: result.rows.map((row) => ({
          clientId: row.clientId,
          syncRunId: syncRun.id,
          platform: row.platform,
          ingestionMethod: row.ingestionMethod,
          sourceAccountId: row.sourceAccountId,
          metricName: row.metricName,
          metricValue: row.metricValue,
          currency: row.currency,
          occurredOn: new Date(row.occurredOn),
          dimensions: row.dimensions,
          originalFieldName: row.sourceTrace.originalFieldName,
          sourceReference: row.sourceTrace.sourceReference,
          importedAt: new Date(row.sourceTrace.importedAt)
        }))
      }),
      db.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "succeeded",
          rowsImported: result.rowsImported,
          finishedAt: new Date()
        }
      })
    ]);

    await updateConnectorHealth({
      accountMappingId: input.accountMappingId,
      connectorType: accountMapping.ingestionMethod,
      healthStatus: "healthy",
      rowsImported: result.rowsImported
    });

    return NextResponse.json({
      syncRunId: syncRun.id,
      status: "succeeded",
      rowsImported: result.rowsImported,
      warnings: result.warnings
    });
  } catch (error) {
    let message = error instanceof Error ? error.message : "Import failed";

    if (!syncRunId) {
      try {
        const result = await runDemoImport(input);

        return NextResponse.json(result);
      } catch (demoError) {
        message =
          demoError instanceof Error ? demoError.message : "Import failed";
      }
    }

    if (syncRunId) {
      await db.syncRun.update({
        where: { id: syncRunId },
        data: {
          status: "failed",
          errorMessage: message,
          finishedAt: new Date()
        }
      });
      await updateConnectorHealth({
        accountMappingId: input.accountMappingId,
        connectorType: connectorType ?? "unknown",
        healthStatus: "failed",
        latestError: message
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
