import { expect, test } from "./fixtures";

const hasHorizontalOverflow = () => document.documentElement.scrollWidth > window.innerWidth;

for (const path of ["/dashboard", "/applications", "/board", "/agenda", "/analytics", "/settings"]) {
  test(`${path} fits a phone screen`, async ({ demo: page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(hasHorizontalOverflow)).toBe(false);
  });
}

test("navigation works through the mobile menu", async ({ demo: page }) => {
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Agenda" }).click();
  await expect(page).toHaveURL(/\/agenda/);
  await expect(page.getByRole("heading", { name: "Agenda", level: 1 })).toBeVisible();
});
