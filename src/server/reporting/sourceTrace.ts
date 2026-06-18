import type {
  NormalizedMetricRow,
  SourceTrace
} from "@/server/connectors/types";

export type SourceTraceSummary = {
  sourceReference: string;
  platform: string;
  connectorType: string;
  sourceAccountId: string;
  metricCount: number;
  importedAt: string;
};

export function buildSourceTraceSummary(
  rows: NormalizedMetricRow[]
): SourceTraceSummary[] {
  const tracesBySource = new Map<string, SourceTraceSummary>();

  for (const row of rows) {
    const trace = row.sourceTrace;
    const key = buildTraceKey(trace);
    const current = tracesBySource.get(key);

    if (current) {
      current.metricCount += 1;
      continue;
    }

    tracesBySource.set(key, {
      sourceReference: trace.sourceReference,
      platform: trace.platform,
      connectorType: trace.connectorType,
      sourceAccountId: trace.sourceAccountId,
      metricCount: 1,
      importedAt: trace.importedAt
    });
  }

  return Array.from(tracesBySource.values());
}

export function collectSourceTraceDetails(
  rows: NormalizedMetricRow[],
  limit = Number.POSITIVE_INFINITY
): SourceTrace[] {
  const tracesByKey = new Map<string, SourceTrace>();

  for (const row of rows) {
    const key = buildDetailedTraceKey(row.sourceTrace);

    if (!tracesByKey.has(key) && tracesByKey.size < limit) {
      tracesByKey.set(key, row.sourceTrace);
    }
  }

  return Array.from(tracesByKey.values());
}

export function countSourceTraceDetails(rows: NormalizedMetricRow[]): number {
  return new Set(rows.map((row) => buildDetailedTraceKey(row.sourceTrace))).size;
}

function buildTraceKey(trace: SourceTrace) {
  return [
    trace.platform,
    trace.connectorType,
    trace.sourceAccountId,
    trace.sourceReference
  ].join(":");
}

function buildDetailedTraceKey(trace: SourceTrace) {
  return [
    trace.platform,
    trace.connectorType,
    trace.sourceAccountId,
    trace.originalFieldName,
    trace.syncRunId,
    trace.sourceReference
  ].join(":");
}
