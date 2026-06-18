import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  accountMappingFindUnique: vi.fn(),
  accountMappingUpdate: vi.fn(),
  connectorUpdateMany: vi.fn()
}));

const importMock = vi.hoisted(() => ({
  defaultImportModeFor: vi.fn((method: string) =>
    method === "google_sheets" || method === "platform_script"
      ? "replace"
      : "append"
  ),
  runImport: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  db: {
    accountMapping: {
      findUnique: dbMock.accountMappingFindUnique,
      update: dbMock.accountMappingUpdate
    },
    connector: {
      updateMany: dbMock.connectorUpdateMany
    }
  }
}));

vi.mock("@/server/imports/runImport", () => ({
  defaultImportModeFor: importMock.defaultImportModeFor,
  ImportRunError: class ImportRunError extends Error {
    constructor(
      message: string,
      readonly result: unknown
    ) {
      super(message);
      this.name = "ImportRunError";
    }
  },
  runImport: importMock.runImport
}));

function healthRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/health/actions", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

describe("health actions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.accountMappingFindUnique.mockResolvedValue({
      id: "mapping_1",
      clientId: "client_1",
      ingestionMethod: "google_sheets",
      fallbackMethod: "csv_upload"
    });
    importMock.runImport.mockResolvedValue({
      syncRunId: "sync_1",
      status: "succeeded",
      rowsImported: 10,
      metricsAdded: 10,
      metricsReplaced: 2,
      warnings: [],
      healthStatus: "healthy"
    });
    dbMock.accountMappingUpdate.mockResolvedValue({
      id: "mapping_1",
      ingestionMethod: "csv_upload",
      fallbackMethod: "google_sheets"
    });
    dbMock.connectorUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("retries an import with the mapping import mode and a recent window", async () => {
    const { POST } = await import("@/app/api/health/actions/route");
    const response = await POST(
      healthRequest({
        action: "retry_sync",
        accountMappingId: "mapping_1"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(importMock.defaultImportModeFor).toHaveBeenCalledWith(
      "google_sheets"
    );
    expect(importMock.runImport).toHaveBeenCalledWith({
      clientId: "client_1",
      accountMappingId: "mapping_1",
      dateRange: {
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      },
      importMode: "replace"
    });
    expect(payload).toMatchObject({
      action: "retry_sync",
      result: {
        status: "succeeded",
        rowsImported: 10
      }
    });
  });

  it("switches to the configured fallback source", async () => {
    const { POST } = await import("@/app/api/health/actions/route");
    const response = await POST(
      healthRequest({
        action: "switch_fallback",
        accountMappingId: "mapping_1"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(dbMock.accountMappingUpdate).toHaveBeenCalledWith({
      where: { id: "mapping_1" },
      data: {
        ingestionMethod: "csv_upload",
        fallbackMethod: "google_sheets"
      },
      select: {
        id: true,
        ingestionMethod: true,
        fallbackMethod: true
      }
    });
    expect(payload).toMatchObject({
      action: "switch_fallback",
      mapping: {
        ingestionMethod: "csv_upload",
        fallbackMethod: "google_sheets"
      }
    });
  });

  it("returns a clear unavailable error when no fallback is configured", async () => {
    dbMock.accountMappingFindUnique.mockResolvedValue({
      id: "mapping_1",
      clientId: "client_1",
      ingestionMethod: "google_sheets",
      fallbackMethod: null
    });

    const { POST } = await import("@/app/api/health/actions/route");
    const response = await POST(
      healthRequest({
        action: "switch_fallback",
        accountMappingId: "mapping_1"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      error: "No fallback source is configured for this mapping."
    });
  });

  it("marks a connector issue as resolved", async () => {
    const { POST } = await import("@/app/api/health/actions/route");
    const response = await POST(
      healthRequest({
        action: "resolve_issue",
        accountMappingId: "mapping_1",
        connectorId: "connector_1"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(dbMock.connectorUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "connector_1",
        accountMappingId: "mapping_1"
      },
      data: {
        healthStatus: "healthy",
        latestError: null,
        lastFailedSync: null
      }
    });
    expect(payload).toEqual({
      action: "resolve_issue",
      message: "Issue marked as resolved."
    });
  });
});
