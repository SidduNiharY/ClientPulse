import { beforeEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  createTransport: vi.fn()
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport
  }
}));

import { sendReportEmail } from "@/server/delivery/email";

describe("sendReportEmail", () => {
  beforeEach(() => {
    createTransport.mockReturnValue({ sendMail });
    sendMail.mockResolvedValue({ messageId: "provider_123" });
  });

  it("sends a PDF report email through SMTP", async () => {
    const result = await sendReportEmail({
      to: ["client@example.com", "owner@example.com"],
      subject: "Weekly report",
      body: "Report attached",
      pdfBuffer: Buffer.from("pdf"),
      filename: "report.pdf"
    });
    const message = sendMail.mock.calls[0][0];

    expect(message.to).toBe("client@example.com,owner@example.com");
    expect(message.attachments[0].contentType).toBe("application/pdf");
    expect(result.providerId).toBe("provider_123");
  });
});
