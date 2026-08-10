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
  const dialog = page.getByRole("dialog", { name: "Test explanation" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "UFT Pricing" })).toBeVisible();
  await expect(dialog.getByText("Most likely cause")).toBeVisible();
  await expect(dialog.getByText("PricingApi", { exact: true }).first()).toBeVisible();
  await dialog.getByRole("button", { name: "Close Test explanation" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/tests$/);
});

test("build, service, and commit details share the modal pattern", async ({ page }) => {
  const cases = [
    { path: "/builds", opener: page.getByRole("link", { name: /^Open build / }).first(), label: "Build details" },
    { path: "/services", opener: page.locator('a[aria-label^="Open "]:not([aria-label$=" in Grafana"])').first(), label: "Service details" },
    { path: "/commits", opener: page.getByRole("link", { name: /^Open commit / }).first(), label: "Commit details" }
  ];

  for (const detail of cases) {
    await page.goto(detail.path);
    await detail.opener.click();
    const dialog = page.getByRole("dialog", { name: detail.label });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: `Close ${detail.label}` }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${detail.path}$`));
  }
});

test("fleet supports additive card selection and bulk actions in one workspace", async ({ page }, testInfo) => {
  let submittedTargets: string[] = [];
  await page.route("**/api/actions/plan", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const body = route.request().postDataJSON() as { targets: string[] };
    submittedTargets = body.targets;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({})
    });
  });

  await page.goto("/fleet");
  await expect(page.getByRole("heading", { name: "Fleet operations" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Sync packages/ })).toBeDisabled();
  const selectionControls = page.locator('[aria-label="Fleet selection controls"]');
  await expect(selectionControls.getByText("1 machine selected", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Deselect BUILD-01,/ })).toHaveAttribute("aria-pressed", "true");

  if (testInfo.project.name === "desktop-chrome") {
    const machineArea = await page.locator('section[aria-labelledby="machine-grid-title"]').boundingBox();
    const actionArea = await page.locator("#machine-actions").boundingBox();
    expect(machineArea).not.toBeNull();
    expect(actionArea).not.toBeNull();
    expect(actionArea!.x).toBeGreaterThan(machineArea!.x + machineArea!.width);
  }

  await page.getByRole("button", { name: /^Select UFT-03,/ }).click();
  await expect(page.getByRole("button", { name: /^Deselect BUILD-01,/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^Deselect UFT-03,/ })).toHaveAttribute("aria-pressed", "true");
  await expect(selectionControls.getByText("2 machines selected", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actions for 2 machines" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Sync packages/ })).toBeDisabled();

  const detailsTrigger = page.getByRole("button", { name: "View details for UFT-03" });
  await detailsTrigger.click();
  await expect.poll(() => page.evaluate(() => ({
    machine: new URL(window.location.href).searchParams.get("machine"),
    targets: new URL(window.location.href).searchParams.get("targets"),
    detail: new URL(window.location.href).searchParams.get("detail")
  }))).toEqual({
    machine: "machine-uft-03",
    targets: "machine-build-01,machine-uft-03",
    detail: "machine"
  });
  const machineDialog = page.getByRole("dialog", { name: "UFT-03 details" });
  await expect(machineDialog).toBeVisible();
  await expect(machineDialog.getByRole("heading", { name: "UFT-03", exact: true })).toBeVisible();
  await expect(machineDialog.getByRole("list", { name: "UFT-03 packages" }).getByText("googlechrome", { exact: true })).toBeVisible();
  await machineDialog.getByRole("button", { name: "Close UFT-03 details" }).click();
  await expect(machineDialog).not.toBeVisible();
  await expect(detailsTrigger).toBeFocused();
  await expect(page.getByRole("radio", { name: /Refresh machine/ })).toBeChecked();

  await page.getByLabel("Operational reason").fill("Verify health across the selected build and test machines.");
  await page.getByRole("button", { name: "Review and create plan" }).click();
  await expect(page.getByRole("status")).toContainText("2 machines");
  expect(submittedTargets).toEqual(["machine-build-01", "machine-uft-03"]);

  await page.getByRole("button", { name: /^Deselect BUILD-01,/ }).click();
  await expect(selectionControls.getByText("1 machine selected", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actions for UFT-03" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Sync packages/ })).toBeEnabled();

  if (testInfo.project.name.startsWith("mobile")) await expectNoHorizontalOverflow(page);

  await page.goto("/actions");
  await expect(page).toHaveURL(/\/fleet#machine-actions$/);
  await expect(page.getByRole("heading", { name: "Fleet operations" })).toBeVisible();

  await page.goto("/fleet/machine-uft-03");
  await expect(page).toHaveURL(/\/fleet\?machine=machine-uft-03&detail=machine$/);
  await expect(page.getByRole("dialog", { name: "UFT-03 details" })).toBeVisible();
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
