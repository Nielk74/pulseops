import { expect, test } from "@playwright/test";

test("overview exposes correlated operational health", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Everything affecting the run, in one timeline." })).toBeVisible();
  await expect(page.getByText("Build success", { exact: true })).toBeVisible();
  await expect(page.getByText("UFT Pricing is 51% slower than normal")).toBeVisible();
});

test("test anomaly opens a ranked explanation", async ({ page }) => {
  await page.goto("/tests");
  await page.getByRole("link", { name: "UFT Pricing", exact: true }).click();
  await expect(page.getByRole("heading", { name: "UFT Pricing" })).toBeVisible();
  await expect(page.getByText("Most likely cause")).toBeVisible();
  await expect(page.getByText("PricingApi", { exact: true }).first()).toBeVisible();
});

test("mobile layout has no horizontal overflow", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile-only assertion");
  await page.goto("/");
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.width).toBeLessThanOrEqual(430);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
});

test("overview API returns live correlation data", async ({ request }) => {
  const response = await request.get("/api/overview");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.metrics.testAnomalies).toBeGreaterThanOrEqual(2);
  expect(body.connectors).toHaveLength(6);
});
