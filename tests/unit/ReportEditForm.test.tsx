import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportEditForm } from "@/components/ReportEditForm";

describe("ReportEditForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("saves edited insights and email draft to the report edit endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reportId: "report_1",
        insightsUpdated: 1,
        emailDraftSaved: true
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportEditForm
        emailDraft={{
          subject: "Original subject",
          body: "Original summary"
        }}
        insights={[
          {
            id: "insight_1",
            insightType: "executive_summary",
            text: "Original insight"
          }
        ]}
        reportId="report_1"
      />
    );

    fireEvent.change(screen.getByLabelText("Executive summary"), {
      target: { value: "Updated insight" }
    });
    fireEvent.change(screen.getByLabelText("Email subject"), {
      target: { value: "Updated subject" }
    });
    fireEvent.change(screen.getByLabelText("Email body"), {
      target: { value: "Updated email body" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save edits" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/reports/report_1/edits",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            insights: [{ id: "insight_1", text: "Updated insight" }],
            emailDraft: {
              subject: "Updated subject",
              body: "Updated email body"
            }
          })
        })
      );
    });
    expect(screen.getByText("Report edits saved.")).toBeInTheDocument();
  });
});
