import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db/client";

const rejectSchema = z.object({
  userId: z.string().min(1),
  comment: z.string().min(1)
});

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params;
  const body = await request.json();
  const parsed = rejectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Rejecting a report requires a comment" },
      { status: 400 }
    );
  }

  const report = await db.report.findUnique({
    where: { id: reportId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1
      }
    }
  });
  const latestVersion = report?.versions[0];

  if (!report || !latestVersion) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  await db.$transaction([
    db.approvalEvent.create({
      data: {
        reportId,
        userId: parsed.data.userId,
        action: "rejected",
        version: latestVersion.versionNumber,
        comment: parsed.data.comment
      }
    }),
    db.report.update({
      where: { id: reportId },
      data: {
        status: "rejected"
      }
    })
  ]);

  return NextResponse.json({
    id: reportId,
    status: "rejected"
  });
}
