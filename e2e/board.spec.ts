import { column, expect, test, toast } from "./fixtures";

test("dragging a card moves it to another stage and the move persists", async ({ demo: page }) => {
  await page.goto("/board");
  const card = column(page, "applied").getByRole("button", { name: /^Hooli,/ });
  const target = column(page, "interview");

  const from = (await card.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height - 10);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height - 10, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 200, { steps: 20 });
  await page.mouse.up();

  await expect(toast(page, "Hooli moved to Interview")).toBeVisible();
  await page.reload();
  await expect(column(page, "interview").getByRole("button", { name: /^Hooli,/ })).toBeVisible();
});

test("the status menu is an accessible alternative to dragging", async ({ demo: page }) => {
  await page.goto("/board");
  await page.getByRole("button", { name: /Change status of Contoso/ }).click();
  await page.getByRole("menuitemradio", { name: "Offer" }).click();
  await expect(column(page, "offer").getByRole("button", { name: /^Contoso,/ })).toBeVisible();
  await expect(column(page, "applied").getByRole("button", { name: /^Contoso,/ })).toHaveCount(0);
});

test("clicking a card opens its details", async ({ demo: page }) => {
  await page.goto("/board");
  await page.getByRole("button", { name: "Lamna Bank", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Software Engineer, Payments")).toBeVisible();
  await expect(sheet.getByText("History")).toBeVisible();
});
