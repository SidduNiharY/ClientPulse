import { ClientForm, type ClientListItem } from "@/components/ClientForm";
import { db } from "@/server/db/client";
import { listDemoClients } from "@/server/demo/memoryStore";

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

    if (clients.length === 0) {
      return listDemoClients().map((client) => ({
        ...client,
        createdAt: client.createdAt.toISOString()
      }));
    }

    return clients.map((client) => ({
      ...client,
      createdAt: client.createdAt.toISOString()
    }));
  } catch {
    return listDemoClients().map((client) => ({
      ...client,
      createdAt: client.createdAt.toISOString()
    }));
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
