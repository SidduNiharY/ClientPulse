import { buildClientSummaryEmail } from "@/server/delivery/emailDraft";
import { describe, expect, it } from "vitest";

describe("buildClientSummaryEmail", () => {
  it("limits highlights and recommendations to client-ready lengths", () => {
    const email = buildClientSummaryEmail({
      clientName: "Demo Ecommerce Client",
      reportPeriod: "June 1-7, 2026",
      highlights: [
        "Revenue improved",
        "ROAS improved",
        "CTR improved",
        "CPC reduced",
        "Orders improved",
        "Internal note excluded"
      ],
      recommendedSteps: [
        "Increase budget",
        "Review search terms",
        "Refresh creatives",
        "Internal action excluded"
      ],
      agencySignature: "Regards,\nAgency Team"
    });

    expect(email.subject).toContain("Demo Ecommerce Client performance report");
    expect(email.body).toContain("Revenue improved");
    expect(email.body).not.toContain("Internal note excluded");
    expect(email.body).not.toContain("Internal action excluded");
  });
});
