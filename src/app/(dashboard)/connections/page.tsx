import Link from "next/link";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

type ConnectionRow = {
  provider: string;
  label: string;
  description: string;
  status: string;
  accountName: string;
  lastDirectSync: Date | null;
  latestError: string | null;
};

const providerMetadata = [
  {
    provider: "google_ads",
    label: "Google Ads",
    description: "OAuth connection with developer token and MCC login customer ID."
  },
  {
    provider: "meta_ads",
    label: "Meta Ads",
    description: "Marketing API token with ads read permissions."
  },
  {
    provider: "ga4",
    label: "GA4",
    description: "OAuth or service account access to the GA4 property."
  },
  {
    provider: "shopify",
    label: "Shopify",
    description: "Store domain and read orders access token."
  }
];

async function getConnectionRows(): Promise<ConnectionRow[]> {
  try {
    const [credentials, mappings] = await Promise.all([
      db.directCredential.findMany({
        orderBy: { updatedAt: "desc" }
      }),
      db.accountMapping.findMany({
        where: { ingestionMethod: "direct_api" },
        include: {
          connectors: {
            where: { connectorType: "direct_api" },
            orderBy: { updatedAt: "desc" },
            take: 1
          }
        }
      })
    ]);

    return providerMetadata.map((provider) => {
      const credential = credentials.find(
        (item) => item.provider === provider.provider
      );
      const mapping = mappings.find(
        (item) => item.platform === provider.provider
      );
      const connector = mapping?.connectors[0];

      return {
        provider: provider.provider,
        label: provider.label,
        description: provider.description,
        status:
          credential?.status ??
          connector?.healthStatus ??
          "needs_authorization",
        accountName: mapping?.accountName ?? "No direct account mapped",
        lastDirectSync: connector?.lastSuccessfulSync ?? null,
        latestError: connector?.latestError ?? null
      };
    });
  } catch {
    return providerMetadata.map((provider) => ({
      provider: provider.provider,
      label: provider.label,
      description: provider.description,
      status: "needs_authorization",
      accountName: "No direct account mapped",
      lastDirectSync: null,
      latestError: null
    }));
  }
}

function formatDate(value: Date | null) {
  if (!value) {
    return "No direct sync yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export default async function ConnectionsPage() {
  const rows = await getConnectionRows();

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
          Direct Connections
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">Connections</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <section
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
            key={row.provider}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-normal">
                  {row.label}
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">
                  {row.description}
                </p>
              </div>
              <Link
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#066b5f]"
                href={`/api/connections/oauth?provider=${row.provider}`}
              >
                Reconnect
              </Link>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-[var(--border)] p-3">
                <dt className="text-sm text-[var(--muted)]">
                  Authorization status
                </dt>
                <dd className="mt-1 font-semibold">
                  {formatStatus(row.status)}
                </dd>
              </div>
              <div className="rounded-md border border-[var(--border)] p-3">
                <dt className="text-sm text-[var(--muted)]">Mapped account</dt>
                <dd className="mt-1 font-semibold">{row.accountName}</dd>
              </div>
              <div className="rounded-md border border-[var(--border)] p-3">
                <dt className="text-sm text-[var(--muted)]">
                  Last direct sync result
                </dt>
                <dd className="mt-1 font-semibold">
                  {formatDate(row.lastDirectSync)}
                </dd>
              </div>
              <div className="rounded-md border border-[var(--border)] p-3">
                <dt className="text-sm text-[var(--muted)]">Latest error</dt>
                <dd className="mt-1 font-semibold">
                  {row.latestError ?? "No direct sync error"}
                </dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
    </section>
  );
}
