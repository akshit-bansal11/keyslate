import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Every test drives the app the way it is meant to be used: from the keyboard.
// The backend is the in-memory mock, so nothing here proves Rust or the disk.

const editor = (page: Page) => page.getByRole("textbox", { name: "Note text" });
const statusBar = (page: Page) => page.getByRole("contentinfo");
const noteRow = (page: Page, title: string | RegExp) =>
  page.getByRole("listbox").getByRole("option", { name: title });
const themeBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ks-bg"));

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(editor(page)).toBeVisible();
});

test("opens the welcome note with a theme applied", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "Keyslate" })).toBeAttached();
  await expect(noteRow(page, /Welcome/)).toBeVisible();
  await expect(statusBar(page)).toContainText("Markdown");
  expect(await themeBackground(page)).toMatch(/^#[0-9a-f]{6}$/i);
});

test("a new note is typed, counted and saved", async ({ page }) => {
  await page.keyboard.press("Control+n");
  await expect(noteRow(page, /Untitled/)).toBeVisible();
  await page.keyboard.press("Alt+e");
  await page.keyboard.type("three small words");
  await expect(statusBar(page)).toContainText("3 words");
  await expect(statusBar(page)).toContainText("Saved");
});

test("the command palette finds and runs a command", async ({ page }) => {
  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();
  await page.keyboard.type("new plain");
  await page.keyboard.press("Enter");
  await expect(palette).toBeHidden();
  await expect(statusBar(page)).toContainText("Plain text");
});

test("quick open creates a note from a new title, and F2 renames it", async ({ page }) => {
  await page.keyboard.press("Control+p");
  await page.keyboard.type("Groceries");
  await page.keyboard.press("Enter");
  await expect(noteRow(page, /Groceries/)).toBeVisible();

  await page.keyboard.press("F2");
  await page.keyboard.type("Shopping");
  await page.keyboard.press("Enter");
  await expect(noteRow(page, /Shopping/)).toBeVisible();
  await expect(noteRow(page, /Groceries/)).toHaveCount(0);
});

test("full-text search opens the note that matches", async ({ page }) => {
  await page.keyboard.press("Control+n");
  await page.keyboard.press("Control+Shift+f");
  const search = page.getByRole("dialog", { name: "Search in all notes" });
  await expect(search).toBeVisible();
  await page.keyboard.type("every command");
  await expect(search.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(search).toBeHidden();
  await expect(editor(page)).toContainText("Welcome to Keyslate");
});

test("trashing moves the note to the trash view", async ({ page }) => {
  await page.keyboard.press("Control+Shift+Delete");
  await expect(noteRow(page, /Welcome/)).toHaveCount(0);
  await page.keyboard.press("Control+k");
  await page.keyboard.type("show trash");
  await page.keyboard.press("Enter");
  await expect(noteRow(page, /Welcome/)).toBeVisible();
});

test("the theme shortcut changes the theme and it survives a reload", async ({ page }) => {
  const before = await themeBackground(page);
  await page.keyboard.press("Control+Alt+t");
  await expect.poll(() => themeBackground(page)).not.toBe(before);
  const after = await themeBackground(page);
  // Settings are written a moment after the change.
  await page.waitForTimeout(600);
  await page.reload();
  await expect(editor(page)).toBeVisible();
  expect(await themeBackground(page)).toBe(after);
});

test("settings open from the keyboard and Escape returns to the editor", async ({ page }) => {
  await page.keyboard.press("Alt+e");
  await page.keyboard.press("Control+,");
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(settings).toBeHidden();
  await expect(editor(page)).toBeFocused();
});

test("the shortcut sheet lists live bindings", async ({ page }) => {
  await page.keyboard.press("F1");
  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("New note");
  await expect(sheet).toContainText("Ctrl+N");
});

test.describe("accessibility and screenshots", () => {
  test("main view, split view, palette and settings pass axe in a dark and a light theme", async ({
    page,
  }) => {
    await page.keyboard.press("Alt+2");
    await expect(page.getByLabel("Preview")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.screenshot({ path: "shots/01-dark-split.png" });

    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.screenshot({ path: "shots/02-dark-palette.png" });
    await page.keyboard.type("theme paper");
    await page.screenshot({ path: "shots/03-dark-palette-filtered.png" });
    await page.keyboard.press("Enter");

    await expectNoAxeViolations(page);
    await page.screenshot({ path: "shots/04-light-split.png" });

    await page.keyboard.press("Control+,");
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.screenshot({ path: "shots/05-light-settings.png" });
    await page.keyboard.press("Escape");

    await page.keyboard.press("F1");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.screenshot({ path: "shots/06-light-shortcuts.png" });
  });

  test("nothing overflows at the minimum window size", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 420 });
    await page.keyboard.press("Alt+2");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    await page.screenshot({ path: "shots/07-minimum-window.png" });
  });
});
