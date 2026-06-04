import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const clientSeed = {
  id: "demo-ecommerce-client",
  name: "Demo Ecommerce Client",
  clientType: "ecommerce",
  primaryEmail: "client@example.com",
  currency: "INR"
};

const accountMappings = [
  {
    platform: "google_ads" as const,
    accountName: "Demo Google Ads",
    sourceAccountId: "123-456-7890",
    ingestionMethod: "csv_upload" as const
  },
  {
    platform: "meta_ads" as const,
    accountName: "Demo Meta Ads",
    sourceAccountId: "act_123456789",
    ingestionMethod: "csv_upload" as const
  },
  {
    platform: "ga4" as const,
    accountName: "Demo GA4",
    sourceAccountId: "properties/123456789",
    ingestionMethod: "csv_upload" as const
  },
  {
    platform: "shopify" as const,
    accountName: "Demo Shopify",
    sourceAccountId: "demo-store.myshopify.com",
    ingestionMethod: "csv_upload" as const
  }
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "agency@example.com" },
    update: {
      name: "Agency Admin",
      role: "admin"
    },
    create: {
      email: "agency@example.com",
      name: "Agency Admin",
      role: "admin"
    }
  });

  await prisma.connector.deleteMany({
    where: {
      accountMapping: {
        clientId: clientSeed.id
      }
    }
  });
  await prisma.accountMapping.deleteMany({
    where: { clientId: clientSeed.id }
  });
  await prisma.clientGoal.deleteMany({
    where: { clientId: clientSeed.id }
  });
  await prisma.clientBudget.deleteMany({
    where: { clientId: clientSeed.id }
  });

  const client = await prisma.client.upsert({
    where: { id: clientSeed.id },
    update: {
      name: clientSeed.name,
      clientType: clientSeed.clientType,
      primaryEmail: clientSeed.primaryEmail,
      currency: clientSeed.currency,
      accountMappings: {
        create: accountMappings.map((mapping) => ({
          ...mapping,
          config: {
            importFormat: "csv",
            ownerEmail: user.email
          },
          connectors: {
            create: {
              connectorType: mapping.ingestionMethod,
              healthStatus: "not_connected"
            }
          }
        }))
      },
      goals: {
        create: [
          {
            platform: "google_ads",
            goalType: "roas",
            targetValue: 4
          },
          {
            platform: "meta_ads",
            goalType: "cost_per_purchase",
            targetValue: 500
          },
          {
            platform: null,
            goalType: "monthly_revenue",
            targetValue: 1000000
          }
        ]
      },
      budgets: {
        create: [
          {
            platform: "google_ads",
            monthlyBudget: 250000,
            weeklyBudget: 62500,
            startsOn: new Date("2026-01-01")
          },
          {
            platform: "meta_ads",
            monthlyBudget: 200000,
            weeklyBudget: 50000,
            startsOn: new Date("2026-01-01")
          }
        ]
      }
    },
    create: {
      id: clientSeed.id,
      name: clientSeed.name,
      clientType: clientSeed.clientType,
      primaryEmail: clientSeed.primaryEmail,
      currency: clientSeed.currency,
      accountMappings: {
        create: accountMappings.map((mapping) => ({
          ...mapping,
          config: {
            importFormat: "csv",
            ownerEmail: user.email
          },
          connectors: {
            create: {
              connectorType: mapping.ingestionMethod,
              healthStatus: "not_connected"
            }
          }
        }))
      },
      goals: {
        create: [
          {
            platform: "google_ads",
            goalType: "roas",
            targetValue: 4
          },
          {
            platform: "meta_ads",
            goalType: "cost_per_purchase",
            targetValue: 500
          },
          {
            platform: null,
            goalType: "monthly_revenue",
            targetValue: 1000000
          }
        ]
      },
      budgets: {
        create: [
          {
            platform: "google_ads",
            monthlyBudget: 250000,
            weeklyBudget: 62500,
            startsOn: new Date("2026-01-01")
          },
          {
            platform: "meta_ads",
            monthlyBudget: 200000,
            weeklyBudget: 50000,
            startsOn: new Date("2026-01-01")
          }
        ]
      }
    }
  });

  console.log(`Seeded ${user.email} and ${client.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
