import { ClientForm, type ClientListItem } from "@/components/ClientForm";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

async function getClients(): Promise<ClientListItem[]> {
  try {
    const clients = await db.client.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        clientType: true,
        primaryEmail: true,
        currency: true,
        createdAt: true
      }
    });

    return clients.map((client) => ({
      ...client,
      createdAt: client.createdAt.toISOString()
    }));
  } catch {
    return [];
  }
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
          Client Operations
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">Clients</h1>
      </div>

      <ClientForm initialClients={clients} />
    </section>
  );
}
