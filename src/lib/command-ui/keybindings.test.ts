import { describe, expect, it } from "vitest";
import {
  bindKey,
  conflictsFor,
  GLOBAL_SHORTCUT_ID,
  judgeKey,
  releaseKey,
} from "@/lib/command-ui/keybindings";
import type { Command } from "@/lib/commands/registry";

const command = (id: string, defaultKey?: string): Command => ({
  id,
  title: id,
  group: "Note",
  ...(defaultKey === undefined ? {} : { defaultKey }),
  run: () => undefined,
});

const COMMANDS = [command("a", "Ctrl+A"), command("b", "Ctrl+B"), command("c")];

describe("bindKey", () => {
  it("stores an override and unbinds the command that held the key", () => {
    expect(bindKey(COMMANDS, {}, "a", "Ctrl+B")).toEqual({ a: "Ctrl+B", b: "" });
  });

  it("drops the override when the key is the default again", () => {
    expect(bindKey(COMMANDS, { a: "Ctrl+J" }, "a", "Ctrl+A")).toEqual({});
  });

  it("releases a key another command took before restoring a default", () => {
    const overrides = { a: "Ctrl+J", c: "Ctrl+A" };
    expect(bindKey(COMMANDS, overrides, "a", "Ctrl+A")).toEqual({});
  });

  it("marks a default as deliberately unbound, and stores nothing for a command with no default", () => {
    expect(bindKey(COMMANDS, {}, "a", "")).toEqual({ a: "" });
    expect(bindKey(COMMANDS, { c: "Ctrl+J" }, "c", "")).toEqual({});
  });

  it("never leaves two commands on one key", () => {
    const overrides = bindKey(COMMANDS, bindKey(COMMANDS, {}, "c", "Ctrl+A"), "b", "Ctrl+A");
    expect(conflictsFor(COMMANDS, overrides, "Ctrl+A").map((entry) => entry.id)).toEqual(["b"]);
  });
});

describe("releaseKey", () => {
  it("unbinds every holder of the key", () => {
    expect(releaseKey(COMMANDS, { c: "Ctrl+A" }, "Ctrl+A")).toEqual({ a: "" });
  });
});

describe("judgeKey", () => {
  const keymap = { commands: COMMANDS, overrides: {}, globalShortcut: "Ctrl+Alt+N" };

  it("accepts a free key, the command's own key, and removal", () => {
    expect(judgeKey(keymap, "a", "Ctrl+J").kind).toBe("ok");
    expect(judgeKey(keymap, "a", "Ctrl+A").kind).toBe("ok");
    expect(judgeKey(keymap, "a", "").kind).toBe("ok");
  });

  it("rejects a key that plain typing produces, and the global shortcut", () => {
    expect(judgeKey(keymap, "a", "Shift+J").kind).toBe("rejected");
    expect(judgeKey(keymap, "a", "Ctrl+Alt+N").kind).toBe("rejected");
    expect(judgeKey(keymap, "a", "F5").kind).toBe("ok");
  });

  it("reports the command that already holds the key", () => {
    expect(judgeKey(keymap, "a", "Ctrl+B")).toMatchObject({
      kind: "conflict",
      others: [{ id: "b" }],
    });
  });

  it("holds the global shortcut to Ctrl or Alt, and to keys no command uses", () => {
    expect(judgeKey(keymap, GLOBAL_SHORTCUT_ID, "F5").kind).toBe("rejected");
    expect(judgeKey(keymap, GLOBAL_SHORTCUT_ID, "Ctrl+B").kind).toBe("conflict");
    expect(judgeKey(keymap, GLOBAL_SHORTCUT_ID, "Ctrl+Alt+J").kind).toBe("ok");
  });
});
