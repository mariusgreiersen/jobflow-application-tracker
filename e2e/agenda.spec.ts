import { column, expect, test, toast } from "./fixtures";

test("scheduling an interview moves an applied application to the Interview stage", async ({ demo: page }) => {
  await page.goto("/agenda");
  await page.getByRole("button", { name: "Schedule interview" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: /^Contoso/ }).click();
  await dialog.getByLabel("Date and time").fill("2026-12-01T10:30");
  await dialog.getByLabel("Preparation notes").fill("System design round");
  await dialog.getByRole("button", { name: "Schedule" }).click();
  await expect(toast(page, "Interview with Contoso scheduled")).toBeVisible();

  await page.goto("/board");
  await expect(column(page, "interview").getByRole("button", { name: /^Contoso,/ })).toBeVisible();
});

test("completing an overdue follow-up removes it from the overdue group", async ({ demo: page }) => {
  await page.goto("/agenda");
  const overdue = page.getByRole("heading", { name: /^Overdue \(\d+\)$/ });
  const before = Number((await overdue.textContent())!.match(/\d+/)![0]);
  await page.getByRole("checkbox", { name: /Mark "Follow up on application status" as done/ }).click();
  if (before === 1) await expect(overdue).toHaveCount(0);
  else await expect(overdue).toHaveText(`Overdue (${before - 1})`);
});

test("follow-ups can be added to an application", async ({ demo: page }) => {
  await page.goto("/agenda");
  await page.getByRole("button", { name: "Add follow-up" }).click();
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: /^Globex Systems/ }).click();
  await page.getByRole("textbox", { name: "Follow-up" }).fill("Send portfolio link");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(toast(page, "Follow-up added")).toBeVisible();
  await expect(page.getByText("Send portfolio link")).toBeVisible();
});
