import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDemoReportDraft } from "@/server/demo/memoryStore";
import { buildReportDraft } from "@/server/reporting/reportBuilder";

const reportCreateSchema = z.object({
  clientId: z.string().min(1),
  reportType: z.enum(["weekly", "monthly"]),
  dateRange: z.object({
    from: z.string().min(1),
    to: z.string().min(1)
  }),
  adSource: z.enum(["google_ads", "meta_ads", "google_ads_meta_ads"]),
  revenueSource: z.enum([
    "shopify",
    "ga4",
    "google_ads_conversion_value",
    "meta_purchase_value",
    "manual"
  ]),
  generatedByUserId: z.string().min(1)
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = reportCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const report = await buildReportDraft(parsed.data);

    return NextResponse.json({
      id: report.reportId,
      versionId: report.versionId,
      status: report.status
    });
  } catch (error) {
    try {
      const report = buildDemoReportDraft(parsed.data);

      return NextResponse.json({
        id: report.reportId,
        versionId: report.versionId,
        status: report.status
      });
    } catch (demoError) {
      return NextResponse.json(
        {
          error:
            demoError instanceof Error
              ? demoError.message
              : error instanceof Error
                ? error.message
                : "Could not generate report"
        },
        { status: 500 }
      );
    }
  }
}
