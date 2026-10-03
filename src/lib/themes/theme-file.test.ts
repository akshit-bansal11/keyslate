import { expect, test } from "vitest";
import { DEFAULT_THEME } from "@/lib/themes/builtin-themes";
import { parseThemeFile, uniqueThemeId } from "@/lib/themes/theme-file";

const file = (theme: unknown) => JSON.stringify(theme);

test("a good theme file is accepted as it is", () => {
  const theme = { ...DEFAULT_THEME, id: "dusk", name: "Dusk" };
  expect(parseThemeFile(file(theme), ["slate"])).toEqual({ theme });
});

test("a bad colour is rejected and the field is named", () => {
  const colors = { ...DEFAULT_THEME.colors, muted: "grey" };
  const result = parseThemeFile(file({ ...DEFAULT_THEME, colors }), []);
  expect(result).toEqual({
    error:
      'This theme cannot be imported: "colors.muted" must be a six-digit hex colour such as #1a2b3c.',
  });
});

test("text that is not JSON is rejected without throwing", () => {
  expect(parseThemeFile("{ not json", [])).toHaveProperty("error");
});

test("an id that is already taken gets a fresh one", () => {
  const result = parseThemeFile(file(DEFAULT_THEME), ["slate", "slate-2"]);
  expect(result).toEqual({ theme: { ...DEFAULT_THEME, id: "slate-3" } });
  expect(uniqueThemeId("x".repeat(64), ["x".repeat(64)]).length).toBeLessThanOrEqual(64);
});
