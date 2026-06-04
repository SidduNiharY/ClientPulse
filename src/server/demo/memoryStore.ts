import { randomUUID } from "node:crypto";
import { CsvConnector } from "@/server/connectors/csvConnector";
import type {
  DateRange,
  IngestionMethod,
  NormalizedMetricRow,
  Platform
} from "@/server/connectors/types";
import {
  buildReportDraftSnapshot,
  type ReportBuildRequest,
  type ReportDraftSnapshot,
  type ReportInsightDraft,
  type ReportType
} from "@/server/reporting/reportBuilder";

type DemoClient = {
  id: string;
  name: string;
  clientType: string;
  primaryEmail: string;
  currency: string;
  createdAt: Date;
};

type DemoMapping = {
  id: string;
  clientId: string;
  platform: Platform;
  accountName: string;
  sourceAccountId: string;
  ingestionMethod: IngestionMethod;
  fallbackMethod: IngestionMethod | null;
  config: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
};

type DemoSyncRun = {
  id: string;
  clientId: string;
  accountMappingId: string;
  platform: Platform;
  ingestionMethod: IngestionMethod;
  dateFrom: Date;
  dateTo: Date;
  status: string;
  rowsImported: number;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

type DemoReportVersion = {
  id: string;
  reportId: string;
  versionNumber: number;
  metricsSnapshot: ReportDraftSnapshot;
  sourceTrace: ReportDraftSnapshot["sourceTrace"];
  pdfPath: string | null;
  htmlSnapshot: string | null;
  createdAt: Date;
  insights: Array<
    ReportInsightDraft & {
      id: string;
      reportVersionId: string;
      isEdited: boolean;
      createdAt: Date;
    }
  >;
  anomalies: Array<
    ReportDraftSnapshot["anomalies"][number] & {
      id: string;
      reportVersionId: string;
      dismissedAt: Date | null;
      comment: string | null;
    }
  >;
  qualityScores: Array<{
    id: string;
    reportVersionId: string;
    score: number;
    rating: string;
    factors: ReportDraftSnapshot["dataQuality"]["factors"];
    createdAt: Date;
  }>;
};

type DemoReport = {
  id: string;
  clientId: string;
  reportType: ReportType;
  dateFrom: Date;
  dateTo: Date;
  adSource: string;
  revenueSource: string;
  status: string;
  generatedByUserId: string;
  approvedAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  versions: DemoReportVersion[];
  emailDrafts: Array<{ id: string; reportId: string; body: string }>;
};

type DemoStore = {
  clients: DemoClient[];
  mappings: DemoMapping[];
  syncRuns: DemoSyncRun[];
  metricRows: NormalizedMetricRow[];
  reports: DemoReport[];
};

const globalForDemoStore = globalThis as unknown as {
  reportingDemoStore?: DemoStore;
};

function store() {
  globalForDemoStore.reportingDemoStore ??= {
    clients: [],
    mappings: [],
    syncRuns: [],
    metricRows: [],
    reports: []
  };

  return globalForDemoStore.reportingDemoStore;
}

export function listDemoClients() {
  return [...store().clients].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export function getDemoClient(clientId: string) {
  return store().clients.find((client) => client.id === clientId) ?? null;
}

export function createDemoClient(input: {
  name: string;
  clientType: string;
  primaryEmail: string;
  currency: string;
}) {
  const existing = store().clients.find(
    (client) => client.name === input.name && client.primaryEmail === input.primaryEmail
  );

  if (existing) {
    return existing;
  }

  const client = {
    id: `client_${randomUUID()}`,
    ...input,
    createdAt: new Date()
  };

  store().clients.unshift(client);

  return client;
}

export function listDemoMappings(clientId: string) {
  return store().mappings.filter((mapping) => mapping.clientId === clientId);
}

export function createDemoMapping(
  clientId: string,
  input: {
    platform: Platform;
    accountName: string;
    sourceAccountId: string;
    ingestionMethod: IngestionMethod;
    fallbackMethod?: IngestionMethod | null;
    config?: Record<string, string>;
  }
) {
  const mapping: DemoMapping = {
    id: `mapping_${randomUUID()}`,
    clientId,
    platform: input.platform,
    accountName: input.accountName,
    sourceAccountId: input.sourceAccountId,
    ingestionMethod: input.ingestionMethod,
    fallbackMethod: input.fallbackMethod ?? null,
    config: input.config ?? {},
    isActive: true,
    createdAt: new Date()
  };

  store().mappings.unshift(mapping);

  return mapping;
}

export function listDemoSyncRuns() {
  return [...store().syncRuns]
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, 20)
    .map((run) => ({
      ...run,
      client: {
        name: getDemoClient(run.clientId)?.name ?? "Demo client"
      },
      accountMapping: {
        platform: run.platform,
        accountName:
          store().mappings.find((mapping) => mapping.id === run.accountMappingId)
            ?.accountName ?? "Demo account",
        ingestionMethod: run.ingestionMethod
      }
    }));
}

export async function runDemoImport(input: {
  clientId: string;
  accountMappingId: string;
  dateRange: DateRange;
  connectorConfig: Record<string, string>;
}) {
  const mapping = store().mappings.find(
    (item) => item.id === input.accountMappingId && item.clientId === input.clientId
  );

  if (!mapping) {
    throw new Error("Account mapping not found");
  }

  const syncRun: DemoSyncRun = {
    id: `sync_${randomUUID()}`,
    clientId: input.clientId,
    accountMappingId: input.accountMappingId,
    platform: mapping.platform,
    ingestionMethod: mapping.ingestionMethod,
    dateFrom: new Date(input.dateRange.from),
    dateTo: new Date(input.dateRange.to),
    status: "running",
    rowsImported: 0,
    errorMessage: null,
    startedAt: new Date(),
    finishedAt: null
  };

  store().syncRuns.unshift(syncRun);

  try {
    const result = await new CsvConnector().fetch({
      clientId: input.clientId,
      accountMappingId: input.accountMappingId,
      dateRange: input.dateRange,
      config: {
        ...mapping.config,
        ...input.connectorConfig,
        platform: mapping.platform,
        sourceAccountId: mapping.sourceAccountId,
        syncRunId: syncRun.id
      }
    });

    store().metricRows.push(...result.rows);
    syncRun.status = "succeeded";
    syncRun.rowsImported = result.rowsImported;
    syncRun.finishedAt = new Date();

    return {
      syncRunId: syncRun.id,
      status: syncRun.status,
      rowsImported: result.rowsImported,
      warnings: result.warnings
    };
  } catch (error) {
    syncRun.status = "failed";
    syncRun.errorMessage =
      error instanceof Error ? error.message : "Import failed";
    syncRun.finishedAt = new Date();
    throw error;
  }
}

export function buildDemoReportDraft(request: ReportBuildRequest) {
  const demoStore = store();
  const client = getDemoClient(request.clientId);

  if (!client) {
    throw new Error("Client not found");
  }

  const metricRows = demoStore.metricRows.filter(
    (row) =>
      row.clientId === request.clientId &&
      row.occurredOn >= request.dateRange.from &&
      row.occurredOn <= request.dateRange.to
  );
  const draft = buildReportDraftSnapshot({
    request,
    clientName: client.name,
    metricRows,
    accountMappingsLoaded: listDemoMappings(client.id).length,
    goalsLoaded: 0,
    budgets: []
  });
  const reportId = `report_${randomUUID()}`;
  const versionId = `version_${randomUUID()}`;
  const report: DemoReport = {
    id: reportId,
    clientId: client.id,
    reportType: request.reportType,
    dateFrom: new Date(request.dateRange.from),
    dateTo: new Date(request.dateRange.to),
    adSource: request.adSource,
    revenueSource: request.revenueSource,
    status: draft.status,
    generatedByUserId: request.generatedByUserId,
    approvedAt: null,
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [
      {
        id: versionId,
        reportId,
        versionNumber: 1,
        metricsSnapshot: draft,
        sourceTrace: draft.sourceTrace,
        pdfPath: null,
        htmlSnapshot: null,
        createdAt: new Date(),
        insights: draft.insights.map((insight) => ({
          id: `insight_${randomUUID()}`,
          reportVersionId: versionId,
          ...insight,
          isEdited: false,
          createdAt: new Date()
        })),
        anomalies: draft.anomalies.map((anomaly) => ({
          id: `anomaly_${randomUUID()}`,
          reportVersionId: versionId,
          ...anomaly,
          dismissedAt: null,
          comment: null
        })),
        qualityScores: [
          {
            id: `quality_${randomUUID()}`,
            reportVersionId: versionId,
            score: draft.dataQuality.score,
            rating: draft.dataQuality.rating,
            factors: draft.dataQuality.factors,
            createdAt: new Date()
          }
        ]
      }
    ],
    emailDrafts: []
  };

  demoStore.reports.unshift(report);

  return {
    reportId,
    versionId,
    status: draft.status,
    draft
  };
}

export function getDemoReportForPreview(reportId: string) {
  const report = store().reports.find((item) => item.id === reportId);

  if (!report) {
    return null;
  }

  return {
    ...report,
    client: getDemoClient(report.clientId) ?? {
      name: "Demo client",
      primaryEmail: "client@example.com"
    }
  };
}

export function approveDemoReport(reportId: string) {
  const report = store().reports.find((item) => item.id === reportId);

  if (!report) {
    return null;
  }

  report.status = "approved";
  report.approvedAt = new Date();
  report.updatedAt = new Date();

  return {
    id: report.id,
    status: report.status,
    approvedAt: report.approvedAt.toISOString()
  };
}

export function sendDemoReport(reportId: string) {
  const report = store().reports.find((item) => item.id === reportId);

  if (!report) {
    return { status: 404 as const, body: { error: "Report not found" } };
  }

  if (report.status !== "approved") {
    return {
      status: 409 as const,
      body: { error: "Only approved reports can be sent" }
    };
  }

  report.status = "sent";
  report.sentAt = new Date();
  report.updatedAt = new Date();

  return {
    status: 200 as const,
    body: {
      id: report.id,
      status: report.status,
      providerId: "demo_email_provider"
    }
  };
}
