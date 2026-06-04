import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db/client";
import { buildClientSummaryEmail } from "@/server/delivery/emailDraft";
import { sendReportEmail } from "@/server/delivery/email";
import { renderReportHtml } from "@/server/pdf/reportTemplate";
import { renderPdfFromHtml } from "@/server/pdf/renderPdf";
import type { ReportDraftSnapshot } from "@/server/reporting/reportBuilder";

const sendSchema = z.object({
  to: z.array(z.string().email()).optional()
});

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params;
  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = sendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid delivery payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const report = await db.report.findUnique({
    where: { id: reportId },
    include: {
      client: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1
      },
      emailDrafts: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  const version = report?.versions[0];

  if (!report || !version) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved reports can be sent" },
      { status: 409 }
    );
  }

  const recipients = parsed.data.to?.length
    ? parsed.data.to
    : [report.client.primaryEmail];
  const recipientLabel = recipients.join(",");

  try {
    const snapshot = version.metricsSnapshot as unknown as ReportDraftSnapshot;
    const pdf = await loadOrGeneratePdf({
      reportId,
      versionId: version.id,
      pdfPath: version.pdfPath,
      clientName: report.client.name,
      snapshot
    });
    const email =
      report.emailDrafts[0] ??
      buildClientSummaryEmail({
        clientName: report.client.name,
        reportPeriod: `${snapshot.dateRange.from} to ${snapshot.dateRange.to}`,
        highlights: snapshot.insights.map((insight) => insight.text),
        recommendedSteps: [],
        agencySignature: "Regards,\nAgency Team"
      });
    const result = await sendReportEmail({
      to: recipients,
      subject: email.subject,
      body: email.body,
      pdfBuffer: pdf,
      filename: `${report.id}.pdf`
    });

    await db.$transaction([
      db.deliveryLog.create({
        data: {
          reportId,
          method: "email",
          recipient: recipientLabel,
          status: "sent",
          providerId: result.providerId,
          sentAt: new Date()
        }
      }),
      db.report.update({
        where: { id: reportId },
        data: {
          status: "sent",
          sentAt: new Date()
        }
      })
    ]);

    return NextResponse.json({
      id: reportId,
      status: "sent",
      providerId: result.providerId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delivery failed";

    await db.$transaction([
      db.deliveryLog.create({
        data: {
          reportId,
          method: "email",
          recipient: recipientLabel,
          status: "failed",
          errorMessage: message
        }
      }),
      db.report.update({
        where: { id: reportId },
        data: {
          status: "failed"
        }
      })
    ]);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function loadOrGeneratePdf(input: {
  reportId: string;
  versionId: string;
  pdfPath: string | null;
  clientName: string;
  snapshot: ReportDraftSnapshot;
}) {
  if (input.pdfPath) {
    return readFile(input.pdfPath);
  }

  const html = renderReportHtml({
    clientName: input.clientName,
    periodLabel: `${input.snapshot.dateRange.from} to ${input.snapshot.dateRange.to}`,
    snapshot: input.snapshot
  });
  const pdf = await renderPdfFromHtml(html);
  const pdfPath = join(tmpdir(), `${input.reportId}-${input.versionId}.pdf`);

  await writeFile(pdfPath, pdf);
  await db.reportVersion.update({
    where: { id: input.versionId },
    data: { pdfPath }
  });

  return pdf;
}
