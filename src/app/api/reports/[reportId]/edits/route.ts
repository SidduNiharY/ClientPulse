import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db/client";

const editsSchema = z.object({
  insights: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1)
      })
    )
    .default([]),
  emailDraft: z
    .object({
      subject: z.string().min(1),
      body: z.string().min(1)
    })
    .optional()
});

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params;
  const body = await request.json();
  const parsed = editsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report edit payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const report = await db.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          id: true,
          insights: {
            select: {
              id: true
            }
          }
        }
      }
    }
  });
  const latestVersion = report?.versions[0];

  if (!report || !latestVersion) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const latestInsightIds = new Set(
    latestVersion.insights.map((insight) => insight.id)
  );
  const invalidInsight = parsed.data.insights.find(
    (insight) => !latestInsightIds.has(insight.id)
  );

  if (invalidInsight) {
    return NextResponse.json(
      {
        error:
          "Insight edits must belong to the latest report version before they can be saved"
      },
      { status: 400 }
    );
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [
    ...parsed.data.insights.map((insight) =>
      db.insight.updateMany({
        where: {
          id: insight.id,
          reportVersionId: latestVersion.id
        },
        data: {
          text: insight.text,
          isEdited: true
        }
      })
    )
  ];

  if (parsed.data.emailDraft) {
    operations.push(
      db.emailDraft.create({
        data: {
          reportId,
          subject: parsed.data.emailDraft.subject,
          body: parsed.data.emailDraft.body,
          isEdited: true
        }
      })
    );
  }

  await db.$transaction(operations);

  return NextResponse.json({
    reportId,
    insightsUpdated: parsed.data.insights.length,
    emailDraftSaved: Boolean(parsed.data.emailDraft)
  });
}
