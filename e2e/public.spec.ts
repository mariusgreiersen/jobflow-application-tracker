import { expect, test } from "@playwright/test";

test("landing page presents the product and both entry points", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Finally organized");
  await expect(page.getByRole("link", { name: /Get started/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Try the demo/ }).first()).toBeVisible();
});

test("app routes redirect anonymous visitors to log in", async ({ page }) => {
  await page.goto("/board");
  await expect(page).toHaveURL(/\/login\?next=%2Fboard/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("the demo can be started from the landing page and exited again", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Try the demo/ }).first().click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("region", { name: "Demo mode" })).toBeVisible();

  await page.getByRole("region", { name: "Demo mode" }).getByRole("button", { name: "Exit" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
