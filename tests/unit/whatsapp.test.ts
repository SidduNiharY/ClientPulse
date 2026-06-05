import { sendReportWhatsApp } from "@/server/delivery/whatsapp";
import { describe, expect, it, vi } from "vitest";

describe("sendReportWhatsApp", () => {
  it("sends the PDF through an injected WhatsApp provider", async () => {
    const provider = {
      sendDocument: vi.fn().mockResolvedValue({ providerId: "wa_123" })
    };
    const result = await sendReportWhatsApp(
      {
        to: "+919999999999",
        filename: "report.pdf",
        pdfBuffer: Buffer.from("pdf"),
        message: "Report attached"
      },
      provider
    );

    expect(provider.sendDocument).toHaveBeenCalledWith({
      to: "+919999999999",
      filename: "report.pdf",
      pdfBuffer: Buffer.from("pdf"),
      message: "Report attached"
    });
    expect(result.providerId).toBe("wa_123");
  });
});
