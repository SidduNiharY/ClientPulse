import { Prisma } from "@prisma/client";
import { BigQueryConnector } from "@/server/connectors/bigQueryConnector";
import { CsvConnector } from "@/server/connectors/csvConnector";
import { GoogleSheetsConnector } from "@/server/connectors/googleSheetsConnector";
import type {
  Connector,
  IngestionMethod,
  Platform
} from "@/server/connectors/types";
import { db } from "@/server/db/client";

const importWriteBatchSize = 5_000;
const disabledDirectImportMessage =
  "This workspace imports data through Google Sheets, CSV, scripts, or BigQuery. Direct API setup has been disabled.";

export type RunImportInput = {
  clientId: string;
  accountMappingId: string;
  dateRange: {
    from: string;
    to: string;
  };
  connectorConfig?: Record<string, string>;
  importMode?: "append" | "replace";
};

export type RunImportResult = {
  syncRunId: string | null;
  status: "succeeded" | "failed";
  rowsImported: number;
  metricsAdded: number;
  metricsReplaced: number;
  warnings: string[];
  healthStatus: "healthy" | "failed";
  error?: string;
};

export class ImportRunError extends Error {
  constructor(
    message: string,
    readonly result: RunImportResult
  ) {
    super(message);
    this.name = "ImportRunError";
  }
}

function createConnector(input: {
  ingestionMethod: IngestionMethod;
  platform: Platform;
}): Connector {
  if (
    input.ingestionMethod === "csv_upload" ||
    input.ingestionMethod === "platform_script"
  ) {
    return new CsvConnector();
  }

  if (input.ingestionMethod === "google_sheets") {
    return new GoogleSheetsConnector();
  }

  if (input.ingestionMethod === "bigquery") {
    return new BigQueryConnector();
  }

  throw new Error(disabledDirectImportMessage);
}

function jsonConfigToRecord(value: Prisma.JsonValue): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, configValue]) => [key, String(configValue)])
  );
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export function defaultImportModeFor(ingestionMethod: IngestionMethod) {
  return ingestionMethod === "google_sheets" ||
    ingestionMethod === "platform_script"
    ? "replace"
    : "append";
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

export async function runImport(
  input: RunImportInput
): Promise<RunImportResult> {
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

    const importMode =
      input.importMode ?? defaultImportModeFor(accountMapping.ingestionMethod);
    const connector = createConnector({
      ingestionMethod: accountMapping.ingestionMethod,
      platform: accountMapping.platform
    });
    const connectorConfig = {
      ...jsonConfigToRecord(accountMapping.config),
      ...(input.connectorConfig ?? {}),
      ingestionMethod: accountMapping.ingestionMethod,
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
    const rawRows = result.rows.map((row) => ({
      syncRunId: syncRun.id,
      sourceReference: row.sourceTrace.sourceReference,
      sourcePayload: row as unknown as Prisma.InputJsonObject
    }));
    const metricRows = result.rows.map((row) => ({
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
    }));
    const replaceExistingMetricWhere: Prisma.MetricRowWhereInput | null =
      importMode === "replace"
        ? {
            clientId: input.clientId,
            platform: accountMapping.platform,
            sourceAccountId: accountMapping.sourceAccountId,
            occurredOn: {
              gte: new Date(input.dateRange.from),
              lte: new Date(input.dateRange.to)
            }
          }
        : null;
    let metricsAdded = 0;
    let metricsReplaced = 0;

    await db.$transaction(
      async (tx) => {
        if (replaceExistingMetricWhere) {
          const deleted = await tx.metricRow.deleteMany({
            where: replaceExistingMetricWhere
          });
          metricsReplaced += deleted.count;
        }

        for (const rawRowsChunk of chunkArray(rawRows, importWriteBatchSize)) {
          await tx.rawSourceRow.createMany({
            data: rawRowsChunk
          });
        }

        for (const metricRowsChunk of chunkArray(
          metricRows,
          importWriteBatchSize
        )) {
          const created = await tx.metricRow.createMany({
            data: metricRowsChunk
          });
          metricsAdded += created.count;
        }

        await tx.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: "succeeded",
            rowsImported: metricsAdded,
            finishedAt: new Date()
          }
        });
      },
      {
        maxWait: 10_000,
        timeout: 600_000
      }
    );

    await updateConnectorHealth({
      accountMappingId: input.accountMappingId,
      connectorType: accountMapping.ingestionMethod,
      healthStatus: "healthy",
      rowsImported: metricsAdded
    });

    return {
      syncRunId: syncRun.id,
      status: "succeeded",
      rowsImported: result.rowsImported,
      metricsAdded,
      metricsReplaced,
      warnings: result.warnings,
      healthStatus: "healthy"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    const failedResult: RunImportResult = {
      error: message,
      healthStatus: "failed",
      metricsAdded: 0,
      metricsReplaced: 0,
      rowsImported: 0,
      status: "failed",
      syncRunId,
      warnings: []
    };

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

    throw new ImportRunError(message, failedResult);
  }
}
