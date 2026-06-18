import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db/client";

const platformSchema = z.enum([
  "google_ads",
  "meta_ads",
  "ga4",
  "shopify",
  "manual"
]);
const ingestionMethodSchema = z.enum([
  "platform_script",
  "google_sheets",
  "bigquery",
  "csv_upload"
]);
const mappingCreateSchema = z.object({
  platform: platformSchema,
  accountName: z.string().min(1),
  sourceAccountId: z.string().min(1),
  ingestionMethod: ingestionMethodSchema,
  fallbackMethod: ingestionMethodSchema.optional().nullable(),
  config: z.record(z.string(), z.unknown()).default({})
});

function serializeMapping(mapping: {
  id: string;
  platform: string;
  accountName: string;
  sourceAccountId: string;
  ingestionMethod: string;
  fallbackMethod?: string | null;
  isActive: boolean;
  createdAt?: Date | string;
}) {
  return {
    id: mapping.id,
    platform: mapping.platform,
    accountName: mapping.accountName,
    sourceAccountId: mapping.sourceAccountId,
    ingestionMethod: mapping.ingestionMethod,
    fallbackMethod: mapping.fallbackMethod ?? null,
    isActive: mapping.isActive,
    createdAt: mapping.createdAt
      ? new Date(mapping.createdAt).toISOString()
      : new Date().toISOString()
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await context.params;

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

    return NextResponse.json(mappings.map(serializeMapping));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not list mappings"
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await context.params;
  const body = await request.json();
  const parsed = mappingCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid mapping payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const mapping = await db.accountMapping.create({
      data: {
        clientId,
        platform: data.platform,
        accountName: data.accountName,
        sourceAccountId: data.sourceAccountId,
        ingestionMethod: data.ingestionMethod,
        fallbackMethod: data.fallbackMethod ?? undefined,
        config: data.config as Prisma.InputJsonObject
      },
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

    return NextResponse.json(serializeMapping(mapping), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create mapping"
      },
      { status: 500 }
    );
  }
}
