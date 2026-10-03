import { describe, expect, it } from "vitest";
import { FONT_SIZE, parseSettings } from "@/lib/settings/settings-schema";

describe("parseSettings", () => {
  it("returns full defaults for nothing, null, and non-objects", () => {
    const defaults = parseSettings(null);
    expect(defaults.themeId).toBe("slate");
    expect(defaults.fontSize).toBe(FONT_SIZE.fallback);
    expect(defaults.keybindings).toEqual({});
    expect(parseSettings("corrupt")).toEqual(defaults);
    expect(parseSettings(undefined)).toEqual(defaults);
  });

  it("resets only the invalid field and keeps the rest", () => {
    const parsed = parseSettings({ fontSize: 999, themeId: "paper", wordWrap: "yes" });
    expect(parsed.fontSize).toBe(FONT_SIZE.fallback);
    expect(parsed.themeId).toBe("paper");
    expect(parsed.wordWrap).toBe(true);
  });

  it("keeps the vault path and an explicitly cleared global shortcut", () => {
    const parsed = parseSettings({ vaultPath: "D:/Notes", globalShortcut: null });
    expect(parsed.vaultPath).toBe("D:/Notes");
    expect(parsed.globalShortcut).toBeNull();
  });

  it("drops custom themes that are not valid themes", () => {
    expect(parseSettings({ customThemes: [{ id: "x", colors: {} }] }).customThemes).toEqual([]);
  });
});
