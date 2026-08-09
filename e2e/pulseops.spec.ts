import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => {
    const width = window.innerWidth;
    const offenders = [...document.querySelectorAll("body *")]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && (rect.right > width + 1 || rect.left < -1))
      .slice(0, 8)
      .map(({ element, rect }) => ({
        element: `${element.tagName.toLowerCase()}.${String(element.className).replaceAll(" ", ".").slice(0, 120)}`,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width)
      }));
    return { width, scrollWidth: document.documentElement.scrollWidth, offenders };
  });
  expect(dimensions.scrollWidth, `Overflowing elements: ${JSON.stringify(dimensions.offenders)}`).toBeLessThanOrEqual(dimensions.width);
}

test("overview exposes correlated operational health", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Everything affecting the run, in one timeline." })).toBeVisible();
  await expect(page.getByText("Build success", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /UFT Pricing is 51% slower than normal/ })).toBeVisible();
});

test("test anomaly opens a ranked explanation", async ({ page }) => {
  await page.goto("/tests");
  await page.getByRole("link", { name: "UFT Pricing", exact: true }).click();
  await expect(page.getByRole("heading", { name: "UFT Pricing" })).toBeVisible();
  await expect(page.getByText("Most likely cause")).toBeVisible();
  await expect(page.getByText("PricingApi", { exact: true }).first()).toBeVisible();
});

test("fleet selection, detail, and actions stay in one workspace", async ({ page }, testInfo) => {
  await page.goto("/fleet");
  await expect(page.getByRole("heading", { name: "Fleet operations" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Sync packages/ })).toBeDisabled();

  const machineCard = page.getByRole("button", { name: /^UFT-03,/ });
  await machineCard.click();
  await expect(machineCard).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\/fleet\?machine=machine-uft-03#machine-detail$/);
  await expect(page.getByRole("heading", { name: "UFT-03", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actions for UFT-03" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Refresh machine/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Sync packages/ })).toBeEnabled();
  await expect(page.getByRole("list", { name: "UFT-03 packages" }).getByText("googlechrome", { exact: true })).toBeVisible();

  if (testInfo.project.name.startsWith("mobile")) await expectNoHorizontalOverflow(page);

  await page.goto("/actions");
  await expect(page).toHaveURL(/\/fleet#machine-actions$/);
  await expect(page.getByRole("heading", { name: "Fleet operations" })).toBeVisible();

  await page.goto("/fleet/machine-uft-03");
  await expect(page).toHaveURL(/\/fleet\?machine=machine-uft-03#machine-detail$/);
  await expect(page.getByRole("heading", { name: "UFT-03", exact: true })).toBeVisible();
});

test("mobile layout has no horizontal overflow", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile-only assertion");
  await page.goto("/");
  expect(page.viewportSize()?.width).toBeLessThanOrEqual(430);
  await expectNoHorizontalOverflow(page);
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
