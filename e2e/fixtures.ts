import { test as base, expect, type Page } from "@playwright/test";

/**
 * Every test starts a fresh demo workspace (each Playwright context has its own
 * localStorage, so tests can't affect each other) and fails if the page logs
 * an uncaught error or a console error.
 */
export const test = base.extend<{ demo: Page }>({
  demo: async ({ page }, provide) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/demo");
    await page.waitForURL("**/dashboard");
    await expect(page.getByText("Total applications")).toBeVisible();

    await provide(page);
    expect(errors, "console errors").toEqual([]);
  },
});

export { expect };

export function column(page: Page, status: string) {
  return page.locator(`section[aria-labelledby='column-${status}']`);
}

/**
 * A toast notification. Matching toasts specifically matters: some messages are
 * also announced to screen readers before the save completes (e.g. dnd-kit's
 * live region on drop), and only the toast confirms the change was persisted.
 */
export function toast(page: Page, text: string | RegExp) {
  return page.locator("[data-sonner-toast]").filter({ hasText: text });
}
