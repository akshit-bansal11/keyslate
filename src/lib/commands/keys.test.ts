import { describe, expect, it } from "vitest";
import { firesWhileTyping, isGlobalAccelerator, keyFromEvent } from "@/lib/commands/keys";

const press = (
  code: string,
  mods: Partial<Record<"ctrl" | "alt" | "shift" | "meta", boolean>> = {},
) =>
  keyFromEvent({
    code,
    ctrlKey: mods.ctrl ?? false,
    altKey: mods.alt ?? false,
    shiftKey: mods.shift ?? false,
    metaKey: mods.meta ?? false,
  });

describe("keyFromEvent", () => {
  it("orders modifiers Ctrl, Alt, Shift whatever order they were pressed in", () => {
    expect(press("KeyK", { shift: true, alt: true, ctrl: true })).toBe("Ctrl+Alt+Shift+K");
  });

  it("names the physical key, so Shift does not change it", () => {
    expect(press("Slash", { shift: true })).toBe("Shift+/");
    expect(press("Digit8", { ctrl: true, shift: true })).toBe("Ctrl+Shift+8");
  });

  it("covers function, arrow and punctuation keys", () => {
    expect(press("F2")).toBe("F2");
    expect(press("ArrowDown", { alt: true })).toBe("Alt+Down");
    expect(press("Backslash", { ctrl: true })).toBe("Ctrl+\\");
    expect(press("Backquote", { ctrl: true })).toBe("Ctrl+`");
  });

  it("returns null for a bare modifier or an unknown key", () => {
    expect(press("ControlLeft", { ctrl: true })).toBeNull();
    expect(press("MediaPlayPause")).toBeNull();
  });
});

describe("firesWhileTyping", () => {
  it("allows only combos plain typing cannot produce", () => {
    expect(firesWhileTyping("Ctrl+N")).toBe(true);
    expect(firesWhileTyping("Alt+P")).toBe(true);
    expect(firesWhileTyping("F1")).toBe(true);
    expect(firesWhileTyping("Shift+/")).toBe(false);
    expect(firesWhileTyping("Delete")).toBe(false);
  });
});

describe("isGlobalAccelerator", () => {
  it("needs Ctrl or Alt", () => {
    expect(isGlobalAccelerator("Ctrl+Alt+N")).toBe(true);
    expect(isGlobalAccelerator("F5")).toBe(false);
  });
});
