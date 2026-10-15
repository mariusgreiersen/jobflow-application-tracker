import { expect, test, toast } from "./fixtures";

test("dashboard metrics are computed from the data", async ({ demo: page }) => {
  for (const label of ["Total applications", "In progress", "Upcoming interviews", "Offers received"]) {
    const card = page.getByRole("paragraph").filter({ hasText: new RegExp(`^${label}$`) });
    await expect(card).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Applications over time" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Needs follow-up" })).toBeVisible();
});

test("analytics shows conversion rates, switches ranges and offers table views", async ({ demo: page }) => {
  await page.goto("/analytics");
  await expect(page.getByText("Interview conversion")).toBeVisible();
  await expect(page.getByText(/^\d+%$/).first()).toBeVisible();

  await page.getByRole("button", { name: "All time" }).click();
  await expect(page.getByRole("button", { name: "All time" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Show data table" }).first().click();
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("profile name changes persist and demo reset restores the sample data", async ({ demo: page }) => {
  await page.goto("/settings");
  await page.getByLabel("Full name").fill("Marius Tester");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(toast(page, "Profile updated")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Marius Tester").first()).toBeVisible();

  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(toast(page, "Demo data reset")).toBeVisible();
  await expect(page.getByText("Alex Demo").first()).toBeVisible();
});

test("the theme can be switched to dark", async ({ demo: page }) => {
  await page.getByRole("button", { name: "Change theme" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
