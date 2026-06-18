import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  accountMappingFindUniqueOrThrow: vi.fn(),
  connectorCreate: vi.fn(),
  connectorUpdateMany: vi.fn(),
  metricRowCreateMany: vi.fn(),
  metricRowDeleteMany: vi.fn(),
  rawSourceRowCreateMany: vi.fn(),
  syncRunCreate: vi.fn(),
  syncRunUpdate: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  db: {
    accountMapping: {
      findUniqueOrThrow: dbMock.accountMappingFindUniqueOrThrow
    },
    connector: {
      create: dbMock.connectorCreate,
      updateMany: dbMock.connectorUpdateMany
    },
    directCredential: {
      findFirst: vi.fn()
    },
    $transaction: dbMock.transaction,
    metricRow: {
      deleteMany: vi.fn()
    },
    rawSourceRow: {
      createMany: vi.fn()
    },
    syncRun: {
      create: dbMock.syncRunCreate,
      update: dbMock.syncRunUpdate
    }
  }
}));

describe("imports route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.accountMappingFindUniqueOrThrow.mockResolvedValue({
      id: "mapping_1",
      platform: "meta_ads",
      ingestionMethod: "platform_script",
      sourceAccountId: "act_123",
      config: {}
    });
    dbMock.syncRunCreate.mockResolvedValue({
      id: "sync_1"
    });
    dbMock.transaction.mockImplementation(async (callback) =>
      callback({
        metricRow: {
          deleteMany: dbMock.metricRowDeleteMany,
          createMany: dbMock.metricRowCreateMany
        },
        rawSourceRow: {
          createMany: dbMock.rawSourceRowCreateMany
        },
        syncRun: {
          update: dbMock.syncRunUpdate
        }
      })
    );
    dbMock.metricRowDeleteMany.mockResolvedValue({ count: 4 });
    dbMock.rawSourceRowCreateMany.mockResolvedValue({ count: 6 });
    dbMock.metricRowCreateMany.mockResolvedValue({ count: 6 });
    dbMock.syncRunUpdate.mockResolvedValue({});
    dbMock.connectorUpdateMany.mockResolvedValue({ count: 1 });
  });

  it(
    "defaults script imports to replace matching dates and returns import counts",
    async () => {
      const { POST } = await import("@/app/api/imports/route");
      const response = await POST(
        new Request("http://localhost/api/imports", {
          method: "POST",
          body: JSON.stringify({
            clientId: "client_1",
            accountMappingId: "mapping_1",
            dateRange: {
              from: "2026-06-01",
              to: "2026-06-07"
            },
            connectorConfig: {
              csv: [
                "date,campaign,impressions,clicks,spend,purchases,purchase_value,leads",
                "2026-06-02,Prospecting,1000,80,120.50,7,650,12"
              ].join("\n"),
              dateField: "date",
              sourceReference: "meta-script-sheet"
            }
          })
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(dbMock.metricRowDeleteMany).toHaveBeenCalledWith({
        where: {
          clientId: "client_1",
          platform: "meta_ads",
          sourceAccountId: "act_123",
          occurredOn: {
            gte: new Date("2026-06-01"),
            lte: new Date("2026-06-07")
          }
        }
      });
      expect(dbMock.metricRowCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            platform: "meta_ads",
            ingestionMethod: "platform_script",
            metricName: "leads",
            metricValue: 12
          })
        ])
      });
      expect(payload).toMatchObject({
        syncRunId: "sync_1",
        status: "succeeded",
        rowsImported: 6,
        metricsAdded: 6,
        metricsReplaced: 4,
        warnings: [],
        healthStatus: "healthy"
      });
    },
    15_000
  );
});
