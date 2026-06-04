import {
  AccountMappingForm,
  type AccountMappingItem
} from "@/components/AccountMappingForm";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

async function getClient(clientId: string) {
  try {
    return await db.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, primaryEmail: true }
    });
  } catch {
    return null;
  }
}

async function getMappings(clientId: string): Promise<AccountMappingItem[]> {
  try {
    const mappings = await db.accountMapping.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        platform: true,
        accountName: true,
        sourceAccountId: true,
        ingestionMethod: true,
        fallbackMethod: true,
        isActive: true,
        createdAt: true
      }
    });

    return mappings.map((mapping) => ({
      ...mapping,
      createdAt: mapping.createdAt.toISOString()
    }));
  } catch {
    return [];
  }
}

export default async function ClientDetailPage({
  params
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const [client, mappings] = await Promise.all([
    getClient(clientId),
    getMappings(clientId)
  ]);

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
          Account Mapping
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          {client?.name ?? "Client account mappings"}
        </h1>
        {client ? (
          <p className="text-sm text-[var(--muted)]">{client.primaryEmail}</p>
        ) : null}
      </div>

      <AccountMappingForm clientId={clientId} initialMappings={mappings} />
    </section>
  );
}
