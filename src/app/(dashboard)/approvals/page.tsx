import Link from "next/link";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

const reportStatuses = [
  "draft",
  "data_ready",
  "needs_review",
  "approved",
  "sent",
  "failed",
  "rejected"
] as const;

type ApprovalReportRow = {
  id: string;
  status: (typeof reportStatuses)[number];
  clientName: string;
  reportPeriod: string;
  revenueSource: string;
  dataQualityRating: string;
  criticalAnomalyCount: number;
  generatedTime: Date;
};

async function getApprovalRows(): Promise<ApprovalReportRow[]> {
  try {
    const reports = await db.report.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
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

    return reports.map((report) => {
      const latestVersion = report.versions[0];

      return {
        id: report.id,
        status: report.status,
        clientName: report.client.name,
        reportPeriod: `${formatDate(report.dateFrom)} to ${formatDate(
          report.dateTo
        )}`,
        revenueSource: report.revenueSource,
        dataQualityRating:
          latestVersion?.qualityScores[0]?.rating ?? "not_scored",
        criticalAnomalyCount:
          latestVersion?.anomalies.filter(
            (anomaly) => anomaly.severity === "critical"
          ).length ?? 0,
        generatedTime: report.createdAt
      };
    });
  } catch {
    return [];
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium"
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

export default async function ApprovalsPage() {
  const rows = await getApprovalRows();
  const groupedRows = new Map(
    reportStatuses.map((status) => [
      status,
      rows.filter((row) => row.status === status)
    ])
  );

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-normal text-[var(--accent)]">
          Approval Inbox
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">Approvals</h1>
      </div>

      {reportStatuses.map((status) => (
        <section
          className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
          key={status}
        >
          <div className="border-b border-[var(--border)] bg-[#eef4f1] px-4 py-3">
            <h2 className="text-lg font-semibold tracking-normal">
              {status.replaceAll("_", " ")}
            </h2>
          </div>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Report period</th>
                <th className="px-4 py-3 font-semibold">Revenue source</th>
                <th className="px-4 py-3 font-semibold">Data quality</th>
                <th className="px-4 py-3 font-semibold">Critical anomalies</th>
                <th className="px-4 py-3 font-semibold">Generated</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(groupedRows.get(status) ?? []).length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-[var(--muted)]" colSpan={7}>
                    No reports in this group.
                  </td>
                </tr>
              ) : (
                (groupedRows.get(status) ?? []).map((row) => (
                  <tr
                    className="border-t border-[var(--border)]"
                    key={row.id}
                  >
                    <td className="px-4 py-3">{row.clientName}</td>
                    <td className="px-4 py-3">{row.reportPeriod}</td>
                    <td className="px-4 py-3">{row.revenueSource}</td>
                    <td className="px-4 py-3">{row.dataQualityRating}</td>
                    <td className="px-4 py-3">{row.criticalAnomalyCount}</td>
                    <td className="px-4 py-3">
                      {formatDateTime(row.generatedTime)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium"
                        href={`/reports/${row.id}`}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ))}
    </section>
  );
}
