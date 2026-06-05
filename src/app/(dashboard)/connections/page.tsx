import Link from "next/link";
import {
  ConnectionCredentialForm,
  type DirectMappingOption
} from "@/components/ConnectionCredentialForm";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

type ConnectionRow = {
  provider: string;
  label: string;
  description: string;
  status: string;
  accountMappingId: string | null;
  sourceAccountId: string | null;
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

async function getConnectionData(): Promise<{
  rows: ConnectionRow[];
  mappings: DirectMappingOption[];
}> {
  try {
    const [credentials, mappings, allMappings] = await Promise.all([
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
      }),
      db.accountMapping.findMany({
        include: {
          client: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    const rows = providerMetadata.map((provider) => {
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
        accountMappingId: mapping?.id ?? null,
        sourceAccountId: mapping?.sourceAccountId ?? null,
        accountName: mapping?.accountName ?? "No direct account mapped",
        lastDirectSync: connector?.lastSuccessfulSync ?? null,
        latestError: connector?.latestError ?? null
      };
    });

    return {
      rows,
      mappings: allMappings
        .filter((mapping) =>
          providerMetadata.some(
            (provider) => provider.provider === mapping.platform
          )
        )
        .map((mapping) => ({
          id: mapping.id,
          provider: mapping.platform as DirectMappingOption["provider"],
          label: `${mapping.client.name} / ${mapping.accountName}`
        }))
    };
  } catch {
    return {
      rows: providerMetadata.map((provider) => ({
        provider: provider.provider,
        label: provider.label,
        description: provider.description,
        status: "needs_authorization",
        accountMappingId: null,
        sourceAccountId: null,
        accountName: "No direct account mapped",
        lastDirectSync: null,
        latestError: null
      })),
      mappings: []
    };
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
  const { rows, mappings } = await getConnectionData();

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
              {row.accountMappingId ? (
                <Link
                  className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                  href={buildOAuthHref(row)}
                >
                  Reconnect
                </Link>
              ) : (
                <Link
                  className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold transition hover:bg-[var(--hover)]"
                  href="/clients"
                >
                  Map account
                </Link>
              )}
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

      <ConnectionCredentialForm mappings={mappings} />
    </section>
  );
}

function buildOAuthHref(row: ConnectionRow) {
  const params = new URLSearchParams({
    provider: row.provider,
    accountMappingId: row.accountMappingId ?? ""
  });

  if (row.provider === "shopify" && row.sourceAccountId) {
    params.set("shopDomain", row.sourceAccountId);
  }

  return `/api/connections/oauth?${params.toString()}`;
}
