import { chromium } from "playwright";

export async function renderPdfFromHtml(html: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1600 }
    });
    await page.setContent(html, { waitUntil: "networkidle" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "16mm",
        right: "14mm",
        bottom: "16mm",
        left: "14mm"
      }
    });
  } finally {
    await browser.close();
  }
}
