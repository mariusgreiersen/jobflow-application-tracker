import { expect, test, toast } from "./fixtures";

test("adding an application validates input and persists across reloads", async ({ demo: page }) => {
  await page.getByRole("button", { name: "Quick add" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Add application" }).click();
  await expect(dialog.getByText("Company name is required")).toBeVisible();

  await dialog.getByLabel("Company").fill("Acme Testing Co");
  await dialog.getByLabel("Job title").fill("QA Engineer");
  await dialog.getByLabel("Job posting URL").fill("not a url");
  await dialog.getByRole("button", { name: "Add application" }).click();
  await expect(dialog.getByText(/full URL/)).toBeVisible();

  await dialog.getByLabel("Job posting URL").fill("https://example.com/jobs/1");
  await dialog.getByRole("button", { name: "Add application" }).click();
  await expect(toast(page, "Added Acme Testing Co")).toBeVisible();

  await page.goto("/applications");
  await page.reload();
  await expect(page.getByRole("button", { name: "Acme Testing Co", exact: true })).toBeVisible();
});

test("search and filters combine and can be cleared", async ({ demo: page }) => {
  await page.goto("/applications");
  const rows = page.locator("tbody tr");
  const company = (name: string) => page.getByRole("button", { name, exact: true });
  await expect(company("Hooli")).toBeVisible();
  const total = await rows.count();

  // Search by location: London-based Hooli disappears, Copenhagen-based Lamna Bank stays.
  await page.getByRole("searchbox", { name: "Search applications" }).fill("copenhagen");
  await expect(company("Hooli")).toHaveCount(0);
  await expect(company("Lamna Bank")).toBeVisible();

  // Adding a status filter narrows the search results further.
  await page.getByRole("combobox", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Applied" }).click();
  await expect(company("Lamna Bank")).toHaveCount(0);
  await expect(company("Adatum Health")).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).first().click();
  await expect(rows).toHaveCount(total);
});

test("editing an application persists, and deleting requires confirmation", async ({ demo: page }) => {
  await page.goto("/applications");
  await page.getByRole("button", { name: "Actions for Hooli" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByLabel("Location").fill("Dublin, Ireland");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(page, "Changes saved")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Dublin, Ireland")).toBeVisible();

  await page.getByRole("button", { name: "Actions for Hooli" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("permanently deletes");
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(toast(page, "Deleted Hooli")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Hooli", exact: true })).toHaveCount(0);
});

test("archiving hides an application until 'Show archived' is on", async ({ demo: page }) => {
  await page.goto("/applications");
  await page.getByRole("button", { name: "Actions for Contoso" }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await expect(toast(page, "Contoso archived")).toBeVisible();
  await expect(page.getByRole("button", { name: "Contoso", exact: true })).toHaveCount(0);

  await page.getByLabel(/Show archived/).click();
  await expect(page.getByRole("button", { name: "Contoso", exact: true })).toBeVisible();
});
