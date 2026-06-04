import { NextResponse } from "next/server";
import { z } from "zod";

const providerSchema = z.enum(["google_ads", "meta_ads", "ga4", "shopify"]);

const providerLabels = {
  google_ads: "Google Ads",
  meta_ads: "Meta",
  ga4: "GA4",
  shopify: "Shopify"
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = providerSchema.safeParse(url.searchParams.get("provider"));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid direct connection provider" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    provider: parsed.data,
    status: "needs_authorization",
    message: `${providerLabels[parsed.data]} OAuth setup is ready for credential exchange configuration.`
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = z
    .object({
      provider: providerSchema,
      accountMappingId: z.string().min(1),
      authorizationCode: z.string().optional()
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid direct connection payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  return NextResponse.json({
    provider: parsed.data.provider,
    accountMappingId: parsed.data.accountMappingId,
    status: "needs_authorization",
    message:
      "Credential exchange requires provider secrets and encrypted token storage configuration."
  });
}
