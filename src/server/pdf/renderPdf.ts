import { chromium } from "playwright";

export async function renderPdfFromHtml(html: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1600 }
    });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    return await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    });
  } finally {
    await browser.close();
  }
}
