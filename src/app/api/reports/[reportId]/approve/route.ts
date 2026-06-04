import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db/client";
import { approveDemoReport } from "@/server/demo/memoryStore";

const approvalSchema = z.object({
  userId: z.string().min(1),
  comment: z.string().optional(),
  confirmPoorQuality: z.boolean().optional()
});

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params;
  const body = await request.json();
  const parsed = approvalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid approval payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const report = await db.report.findUnique({
      where: { id: reportId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            anomalies: true,
            qualityScores: true
          }
        }
      }
    });
    const latestVersion = report?.versions[0];

    if (!report || !latestVersion) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const qualityRating = latestVersion.qualityScores[0]?.rating;

    if (qualityRating === "poor" && !parsed.data.confirmPoorQuality) {
      return NextResponse.json(
        { error: "Poor data quality requires explicit confirmation" },
        { status: 409 }
      );
    }

    const hasCriticalInternalAnomalies = latestVersion.anomalies.some(
      (anomaly) =>
        anomaly.severity === "critical" &&
        !anomaly.clientSafe &&
        anomaly.dismissedAt === null
    );

    if (hasCriticalInternalAnomalies) {
      return NextResponse.json(
        {
          error: "Critical internal anomalies must be resolved before approval"
        },
        { status: 409 }
      );
    }

    const approvedAt = new Date();

    await db.$transaction([
      db.approvalEvent.create({
        data: {
          reportId,
          userId: parsed.data.userId,
          action: "approved",
          version: latestVersion.versionNumber,
          comment: parsed.data.comment
        }
      }),
      db.report.update({
        where: { id: reportId },
        data: {
          status: "approved",
          approvedAt
        }
      })
    ]);

    return NextResponse.json({
      id: reportId,
      status: "approved",
      approvedAt: approvedAt.toISOString()
    });
  } catch {
    const approvedReport = approveDemoReport(reportId);

    if (!approvedReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(approvedReport);
  }
}
