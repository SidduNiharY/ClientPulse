import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { renderReportHtml } from "@/server/pdf/reportTemplate";
import { renderPdfFromHtml } from "@/server/pdf/renderPdf";
import type { ReportDraftSnapshot } from "@/server/reporting/reportBuilder";

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params;

  try {
    const report = await db.report.findUnique({
      where: { id: reportId },
      include: {
        client: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1
        }
      }
    });
    const version = report?.versions[0];

    if (!report || !version) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const snapshot = version.metricsSnapshot as unknown as ReportDraftSnapshot;
    const html = renderReportHtml({
      clientName: report.client.name,
      periodLabel: `${snapshot.dateRange.from} to ${snapshot.dateRange.to}`,
      snapshot
    });
    const pdf = await renderPdfFromHtml(html);
    const pdfPath = join(tmpdir(), `${report.id}-${version.id}.pdf`);

    await writeFile(pdfPath, pdf);
    await db.reportVersion.update({
      where: { id: version.id },
      data: { pdfPath }
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${report.id}.pdf"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not render PDF"
      },
      { status: 500 }
    );
  }
}
