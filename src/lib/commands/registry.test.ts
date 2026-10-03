import { describe, expect, it, vi } from "vitest";
import {
  type Command,
  commandForKey,
  getCommands,
  keyFor,
  registerCommands,
  runCommand,
  subscribeCommands,
} from "@/lib/commands/registry";

const command = (id: string, defaultKey?: string): Command => ({
  id,
  title: id,
  group: "App",
  defaultKey,
  run: vi.fn(),
});

describe("command registry", () => {
  it("registers, notifies, and unregisters only what the call added", () => {
    const listener = vi.fn();
    const stop = subscribeCommands(listener);
    const first = command("t.a", "Ctrl+1");
    const removeFirst = registerCommands([first]);
    const replacement = command("t.a", "Ctrl+2");
    const removeReplacement = registerCommands([replacement]);

    removeFirst();
    expect(getCommands()).toContain(replacement);

    removeReplacement();
    expect(getCommands().some((entry) => entry.id === "t.a")).toBe(false);
    expect(listener).toHaveBeenCalled();
    stop();
  });

  it("resolves a key through overrides: missing is default, empty is unbound", () => {
    const save = command("t.save", "Ctrl+S");
    expect(keyFor(save, {})).toBe("Ctrl+S");
    expect(keyFor(save, { "t.save": "Ctrl+J" })).toBe("Ctrl+J");
    expect(keyFor(save, { "t.save": "" })).toBeUndefined();
  });

  it("finds the command for a key and stops finding it once rebound", () => {
    const save = command("t.find", "Ctrl+9");
    const remove = registerCommands([save]);
    expect(commandForKey("Ctrl+9", {})).toBe(save);
    expect(commandForKey("Ctrl+9", { "t.find": "Ctrl+8" })).toBeUndefined();
    expect(commandForKey("Ctrl+8", { "t.find": "Ctrl+8" })).toBe(save);
    remove();
  });

  it("runs by id, rejects when the command throws, ignores unknown ids", async () => {
    const failing: Command = {
      ...command("t.fail"),
      run: () => {
        throw new Error("boom");
      },
    };
    const remove = registerCommands([failing]);
    await expect(runCommand("t.fail")).rejects.toThrow("boom");
    await expect(runCommand("t.unknown")).resolves.toBeUndefined();
    remove();
  });
});
