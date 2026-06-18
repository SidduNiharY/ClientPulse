import { describe, expect, it, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const updateMany = vi.fn();
const create = vi.fn();
const transaction = vi.fn();

vi.mock("@/server/db/client", () => ({
  db: {
    report: {
      findUnique
    },
    insight: {
      updateMany
    },
    emailDraft: {
      create
    },
    $transaction: transaction
  }
}));

describe("report edits route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (operations) => Promise.all(operations));
  });

  it("persists edited insights and email draft for the latest report version", async () => {
    findUnique.mockResolvedValue({
      id: "report_1",
      versions: [
        {
          id: "version_1",
          versionNumber: 2,
          insights: [
            { id: "insight_1", insightType: "executive_summary" },
            { id: "insight_2", insightType: "recommended_actions" }
          ]
        }
      ]
    });
    updateMany.mockResolvedValue({ count: 1 });
    create.mockResolvedValue({
      id: "draft_1",
      subject: "Updated subject",
      body: "Updated client summary"
    });

    const { POST } = await import("@/app/api/reports/[reportId]/edits/route");
    const response = await POST(
      new Request("http://localhost/api/reports/report_1/edits", {
        method: "POST",
        body: JSON.stringify({
          insights: [
            { id: "insight_1", text: "Updated executive summary" },
            { id: "insight_2", text: "Updated next steps" }
          ],
          emailDraft: {
            subject: "Updated subject",
            body: "Updated client summary"
          }
        })
      }),
      { params: Promise.resolve({ reportId: "report_1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      reportId: "report_1",
      insightsUpdated: 2,
      emailDraftSaved: true
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "insight_1",
        reportVersionId: "version_1"
      },
      data: {
        text: "Updated executive summary",
        isEdited: true
      }
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        reportId: "report_1",
        subject: "Updated subject",
        body: "Updated client summary",
        isEdited: true
      }
    });
  });

  it("rejects insight edits that are not part of the latest report version", async () => {
    findUnique.mockResolvedValue({
      id: "report_1",
      versions: [
        {
          id: "version_1",
          versionNumber: 2,
          insights: [{ id: "insight_1", insightType: "executive_summary" }]
        }
      ]
    });

    const { POST } = await import("@/app/api/reports/[reportId]/edits/route");
    const response = await POST(
      new Request("http://localhost/api/reports/report_1/edits", {
        method: "POST",
        body: JSON.stringify({
          insights: [{ id: "other_insight", text: "Should not save" }]
        })
      }),
      { params: Promise.resolve({ reportId: "report_1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("latest report version");
    expect(updateMany).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
