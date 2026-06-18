import { NextResponse } from "next/server";
import { z } from "zod";
import { ImportRunError, runImport } from "@/server/imports/runImport";

const importRequestSchema = z.object({
  clientId: z.string().min(1),
  accountMappingId: z.string().min(1),
  dateRange: z.object({
    from: z.string().min(1),
    to: z.string().min(1)
  }),
  connectorConfig: z.record(z.string(), z.string()).default({}),
  importMode: z.enum(["append", "replace"]).optional()
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = importRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid import payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await runImport(parsed.data));
  } catch (error) {
    if (error instanceof ImportRunError) {
      return NextResponse.json(error.result, { status: 500 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Import failed",
        healthStatus: "failed",
        metricsAdded: 0,
        metricsReplaced: 0,
        rowsImported: 0,
        status: "failed",
        syncRunId: null,
        warnings: []
      },
      { status: 500 }
    );
  }
}
