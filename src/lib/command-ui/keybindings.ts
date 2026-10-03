import { firesWhileTyping, isGlobalAccelerator } from "@/lib/commands/keys";
import { type Command, keyFor } from "@/lib/commands/registry";
import { parseSettings } from "@/lib/settings/settings-schema";

export type KeyOverrides = Readonly<Record<string, string>>;

/** Row id of the system-wide shortcut. Command ids are dotted, so it cannot collide with one. */
export const GLOBAL_SHORTCUT_ID = "global-shortcut";
export const GLOBAL_SHORTCUT_TITLE = "Summon Keyslate and start a new note from anywhere";
export const DEFAULT_GLOBAL_SHORTCUT = parseSettings(null).globalShortcut;

export interface Keymap {
  commands: readonly Command[];
  overrides: KeyOverrides;
  globalShortcut: string | null;
}

/** What the keybinding editor is in the middle of, for one row at a time. */
export interface KeybindingEdit {
  /** A command id, or `GLOBAL_SHORTCUT_ID`. */
  target: string;
  /** Why the last combination was turned down; recording continues. */
  problem?: string;
  /** Set once a combination needs a decision; recording has stopped. */
  conflict?: { key: string; message: string };
}

export type KeyVerdict =
  | { kind: "ok" }
  | { kind: "rejected"; reason: string }
  | { kind: "conflict"; others: Command[] };

/** Stores a key for one command ("" unbinds it), dropping an override that only restates the default. */
function withKey(overrides: KeyOverrides, command: Command, key: string): KeyOverrides {
  const rest = Object.fromEntries(Object.entries(overrides).filter(([id]) => id !== command.id));
  return key === (command.defaultKey ?? "") ? rest : { ...rest, [command.id]: key };
}

/** Every command currently on `key`, other than `exceptId`. */
export function conflictsFor(
  commands: readonly Command[],
  overrides: KeyOverrides,
  key: string,
  exceptId?: string,
): Command[] {
  return commands.filter(
    (command) => command.id !== exceptId && keyFor(command, overrides) === key,
  );
}

/** Unbinds every command on `key`, other than `exceptId`. */
export function releaseKey(
  commands: readonly Command[],
  overrides: KeyOverrides,
  key: string,
  exceptId?: string,
): KeyOverrides {
  return conflictsFor(commands, overrides, key, exceptId).reduce(
    (next, command) => withKey(next, command, ""),
    overrides,
  );
}

/**
 * Overrides after giving `key` to one command ("" unbinds it). Any other
 * command on that key loses it, so a key never runs two commands.
 */
export function bindKey(
  commands: readonly Command[],
  overrides: KeyOverrides,
  id: string,
  key: string,
): KeyOverrides {
  const command = commands.find((entry) => entry.id === id);
  if (!command) return overrides;
  return withKey(releaseKey(commands, overrides, key, id), command, key);
}

/** Whether `key` may go to `target` as is, must be refused, or needs the user to settle a conflict. */
export function judgeKey(keymap: Keymap, target: string, key: string): KeyVerdict {
  if (key === "") return { kind: "ok" };
  if (target === GLOBAL_SHORTCUT_ID) {
    if (!isGlobalAccelerator(key)) {
      return { kind: "rejected", reason: `${key} cannot work from other apps. Add Ctrl or Alt.` };
    }
  } else if (!firesWhileTyping(key)) {
    return {
      kind: "rejected",
      reason: `${key} would fire while you type in a note. Add Ctrl or Alt, or use a function key.`,
    };
  } else if (key === keymap.globalShortcut) {
    return {
      kind: "rejected",
      reason: `${key} is the global shortcut. Change the global shortcut first, or choose another combination.`,
    };
  }
  const others = conflictsFor(keymap.commands, keymap.overrides, key, target);
  return others.length > 0 ? { kind: "conflict", others } : { kind: "ok" };
}
