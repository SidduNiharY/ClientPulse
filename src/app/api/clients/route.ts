import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db/client";
import { createDemoClient, listDemoClients } from "@/server/demo/memoryStore";

const clientCreateSchema = z.object({
  name: z.string().min(1),
  clientType: z.string().min(1),
  primaryEmail: z.string().email(),
  currency: z.string().min(3).max(3)
});

function serializeClient(client: {
  id: string;
  name: string;
  clientType: string;
  primaryEmail: string;
  currency: string;
  createdAt?: Date | string;
}) {
  return {
    id: client.id,
    name: client.name,
    clientType: client.clientType,
    primaryEmail: client.primaryEmail,
    currency: client.currency,
    createdAt: client.createdAt
      ? new Date(client.createdAt).toISOString()
      : new Date().toISOString()
  };
}

export async function GET() {
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

    return NextResponse.json(clients.map(serializeClient));
  } catch {
    return NextResponse.json(listDemoClients().map(serializeClient));
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = clientCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid client payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const client = await db.client.create({
      data: parsed.data,
      select: {
        id: true,
        name: true,
        clientType: true,
        primaryEmail: true,
        currency: true,
        createdAt: true
      }
    });

    return NextResponse.json(serializeClient(client), { status: 201 });
  } catch {
    return NextResponse.json(serializeClient(createDemoClient(parsed.data)), {
      status: 201
    });
  }
}
