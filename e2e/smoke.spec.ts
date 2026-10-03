import { expect, test } from "@playwright/test";

test("the app loads against the in-memory backend", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Keyslate" })).toBeAttached();
  await expect(page.getByRole("contentinfo")).toContainText("Markdown");
});
