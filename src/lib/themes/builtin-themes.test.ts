import { expect, test } from "vitest";
import { themeSchema } from "@/lib/settings/settings-schema";
import { BUILTIN_THEMES } from "@/lib/themes/builtin-themes";
import { themeContrastIssues } from "@/lib/themes/contrast";

test("there are three dark and three light themes with unique ids", () => {
  expect(BUILTIN_THEMES.filter((theme) => theme.scheme === "dark")).toHaveLength(3);
  expect(BUILTIN_THEMES.filter((theme) => theme.scheme === "light")).toHaveLength(3);
  expect(new Set(BUILTIN_THEMES.map((theme) => theme.id)).size).toBe(BUILTIN_THEMES.length);
});

test.each(BUILTIN_THEMES)("$name is a valid theme and meets every contrast target", (theme) => {
  expect(themeSchema.safeParse(theme).success).toBe(true);
  expect(themeContrastIssues(theme)).toEqual([]);
});

test.each(BUILTIN_THEMES)("$name steps off pure black and pure white", (theme) => {
  const { bg, text } = theme.colors;
  for (const colour of [bg, text]) expect(["#000000", "#ffffff"]).not.toContain(colour);
});
