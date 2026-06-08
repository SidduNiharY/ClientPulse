import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const legacyDemoClientId = "demo-ecommerce-client";
const defaultAgencyUserEmail =
  process.env.DEFAULT_AGENCY_USER_EMAIL ?? "agency@example.com";

async function removeLegacyDemoClient() {
  const reports = await prisma.report.findMany({
    where: { clientId: legacyDemoClientId },
    select: { id: true }
  });
  const reportIds = reports.map((report) => report.id);
  const versions = await prisma.reportVersion.findMany({
    where: { reportId: { in: reportIds } },
    select: { id: true }
  });
  const versionIds = versions.map((version) => version.id);
  const syncRuns = await prisma.syncRun.findMany({
    where: { clientId: legacyDemoClientId },
    select: { id: true }
  });
  const syncRunIds = syncRuns.map((run) => run.id);
  const mappings = await prisma.accountMapping.findMany({
    where: { clientId: legacyDemoClientId },
    select: { id: true }
  });
  const mappingIds = mappings.map((mapping) => mapping.id);

  await prisma.$transaction([
    prisma.insight.deleteMany({
      where: { reportVersionId: { in: versionIds } }
    }),
    prisma.anomaly.deleteMany({
      where: { reportVersionId: { in: versionIds } }
    }),
    prisma.dataQualityScore.deleteMany({
      where: { reportVersionId: { in: versionIds } }
    }),
    prisma.emailDraft.deleteMany({
      where: { reportId: { in: reportIds } }
    }),
    prisma.deliveryLog.deleteMany({
      where: { reportId: { in: reportIds } }
    }),
    prisma.approvalEvent.deleteMany({
      where: { reportId: { in: reportIds } }
    }),
    prisma.reportVersion.deleteMany({
      where: { id: { in: versionIds } }
    }),
    prisma.report.deleteMany({
      where: { id: { in: reportIds } }
    }),
    prisma.rawSourceRow.deleteMany({
      where: { syncRunId: { in: syncRunIds } }
    }),
    prisma.metricRow.deleteMany({
      where: { clientId: legacyDemoClientId }
    }),
    prisma.syncRun.deleteMany({
      where: { id: { in: syncRunIds } }
    }),
    prisma.connector.deleteMany({
      where: { accountMappingId: { in: mappingIds } }
    }),
    prisma.directCredential.deleteMany({
      where: { accountMappingId: { in: mappingIds } }
    }),
    prisma.accountMapping.deleteMany({
      where: { id: { in: mappingIds } }
    }),
    prisma.clientGoal.deleteMany({
      where: { clientId: legacyDemoClientId }
    }),
    prisma.clientBudget.deleteMany({
      where: { clientId: legacyDemoClientId }
    }),
    prisma.client.deleteMany({
      where: { id: legacyDemoClientId }
    })
  ]);
}

async function main() {
  await removeLegacyDemoClient();

  const user = await prisma.user.upsert({
    where: { email: defaultAgencyUserEmail },
    update: {
      name: "Agency Admin",
      role: "admin"
    },
    create: {
      email: defaultAgencyUserEmail,
      name: "Agency Admin",
      role: "admin"
    }
  });

  console.log(`Seeded agency user ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
