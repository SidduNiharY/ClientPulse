import { expect, test } from "@playwright/test";

test("admin can create a client and map a Google Ads account", async ({
  page
}) => {
  await page.goto("/clients");
  await page.getByLabel("Client name").fill("Demo Ecommerce Client");
  await page.getByLabel("Primary email").fill("client@example.com");
  await page.getByLabel("Currency").fill("INR");
  await page.getByRole("button", { name: "Create client" }).click();

  await expect(page.getByText("Demo Ecommerce Client")).toBeVisible();
  await page.getByRole("link", { name: "Demo Ecommerce Client" }).click();

  await page.getByLabel("Platform").selectOption("google_ads");
  await page.getByLabel("Account name").fill("Demo Google Ads");
  await page.getByLabel("Source account ID").fill("123-456-7890");
  await page.getByLabel("Ingestion method").selectOption("csv_upload");
  await page.getByRole("button", { name: "Add mapping" }).click();

  await expect(page.getByText("Demo Google Ads")).toBeVisible();
});
