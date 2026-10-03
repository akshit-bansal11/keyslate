import { expect, test } from "vitest";
import { DEFAULT_THEME } from "@/lib/themes/builtin-themes";
import { contrastRatio, themeContrastIssues } from "@/lib/themes/contrast";

test("contrast ratio matches the WCAG reference pairs", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  expect(contrastRatio("#3a7bd5", "#3a7bd5")).toBe(1);
  expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
});

test("an unreadable pair is reported in plain language", () => {
  const colors = { ...DEFAULT_THEME.colors, muted: "#4a5262" };
  const issues = themeContrastIssues({ ...DEFAULT_THEME, colors });
  expect(issues).toHaveLength(3);
  expect(issues[1]).toMatch(/^Muted text on the sidebar is \d\.\d\d:1; it needs 4\.5:1$/);
});
