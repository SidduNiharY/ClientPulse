import { db } from "@/server/db/client";
import { defaultImportModeFor, runImport } from "@/server/imports/runImport";

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultDateRange() {
  const to = new Date();
  to.setDate(to.getDate() - 1);
  const from = new Date(to);
  from.setDate(from.getDate() - 6);

  return {
    from: toDateInput(from),
    to: toDateInput(to)
  };
}

async function main() {
  const dateRange = {
    from: process.env.SCHEDULED_SYNC_FROM ?? defaultDateRange().from,
    to: process.env.SCHEDULED_SYNC_TO ?? defaultDateRange().to
  };
  const mappings = await db.accountMapping.findMany({
    where: {
      ingestionMethod: {
        in: ["google_sheets", "platform_script", "bigquery"]
      },
      isActive: true
    },
    orderBy: [{ client: { name: "asc" } }, { platform: "asc" }],
    select: {
      id: true,
      clientId: true,
      platform: true,
      ingestionMethod: true,
      accountName: true,
      client: {
        select: {
          name: true
        }
      }
    }
  });
  let failures = 0;

  console.log(
    `Scheduled sync: ${mappings.length} mapping(s), ${dateRange.from} to ${dateRange.to}`
  );

  for (const mapping of mappings) {
    try {
      const result = await runImport({
        accountMappingId: mapping.id,
        clientId: mapping.clientId,
        dateRange,
        importMode: defaultImportModeFor(mapping.ingestionMethod)
      });

      console.log(
        [
          "ok",
          mapping.client.name,
          mapping.platform,
          mapping.accountName,
          `${result.metricsAdded} metric row(s)`,
          result.syncRunId
        ].join(" | ")
      );
    } catch (error) {
      failures += 1;
      console.error(
        [
          "failed",
          mapping.client.name,
          mapping.platform,
          mapping.accountName,
          error instanceof Error ? error.message : "Import failed"
        ].join(" | ")
      );
    }
  }

  await db.$disconnect();

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await db.$disconnect();
  process.exitCode = 1;
});
