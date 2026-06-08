import { expect, type Page, test } from "@playwright/test";

test("agency user imports data, generates, approves, and sends an email report", async ({
  page
}) => {
  const clientName = `Google Reporting Client ${Date.now()}`;

  await page.goto("/clients");
  await page.getByLabel("Client name").fill(clientName);
  await page.getByLabel("Primary email").fill("client@example.com");
  await page.getByLabel("Currency").fill("INR");
  await page.getByRole("button", { name: "Create client" }).click();
  await page.getByRole("link", { name: clientName }).click();

  await addMapping(page, {
    platform: "google_ads",
    accountName: "Google Ads",
    sourceAccountId: "123-456-7890"
  });
  await addMapping(page, {
    platform: "ga4",
    accountName: "GA4 Revenue",
    sourceAccountId: "properties/123456789"
  });

  await runImport(page, {
    clientName,
    platform: "google_ads",
    fixture: "tests/fixtures/google-ads-week.csv"
  });
  await runImport(page, {
    clientName,
    platform: "ga4",
    fixture: "tests/fixtures/ga4-week.csv"
  });

  await page.goto("/reports/new");
  await page.getByLabel("Client").selectOption({ label: clientName });
  await page.getByLabel("Report type").selectOption("weekly");
  await page.getByLabel("Report date").fill("2026-06-04");
  await page.getByLabel("Ad source").selectOption("google_ads");
  await page.getByLabel("Revenue source").selectOption("ga4");
  await page.getByRole("button", { name: "Generate draft" }).click();

  await expect(page.getByText("Needs review")).toBeVisible();
  await expect(page.getByText("GA4 revenue", { exact: true })).toBeVisible();
  await expect(page.getByText("Data quality")).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved")).toBeVisible();

  await page.getByRole("button", { name: "Send email" }).click();
  await expect(page.getByText("Sent")).toBeVisible();
});

async function addMapping(
  page: Page,
  input: {
    platform: "google_ads" | "ga4";
    accountName: string;
    sourceAccountId: string;
  }
) {
  await page.getByLabel("Platform").selectOption(input.platform);
  await page.getByLabel("Account name").fill(input.accountName);
  await page.getByLabel("Source account ID").fill(input.sourceAccountId);
  await page.getByLabel("Ingestion method").selectOption("csv_upload");
  await page.getByRole("button", { name: "Add mapping" }).click();

  const mappingRow = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: input.accountName, exact: true }),
    hasText: input.sourceAccountId
  });

  await expect(mappingRow).toBeVisible();
}

async function runImport(
  page: Page,
  input: {
    clientName: string;
    platform: "google_ads" | "ga4";
    fixture: string;
  }
) {
  await page.goto("/imports");
  await page.getByLabel("Client").selectOption({ label: input.clientName });
  await page.getByLabel("Platform").selectOption(input.platform);
  await page.setInputFiles('input[type="file"]', input.fixture);
  await page.getByRole("button", { name: "Run import" }).click();
  await expect(page.getByText("Import completed")).toBeVisible();
}
