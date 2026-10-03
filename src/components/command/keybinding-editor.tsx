import { useState } from "react";
import { KeybindingRow } from "@/components/command/keybinding-row";
import { useCommands } from "@/hooks/use-commands";
import { cn } from "@/lib/cn";
import { filterCommands, matchesFilter } from "@/lib/command-ui/command-filter";
import { groupCommands } from "@/lib/command-ui/command-groups";
import {
  bindKey,
  DEFAULT_GLOBAL_SHORTCUT,
  GLOBAL_SHORTCUT_ID,
  GLOBAL_SHORTCUT_TITLE,
  judgeKey,
  type KeybindingEdit,
  releaseKey,
} from "@/lib/command-ui/keybindings";
import { keyFor } from "@/lib/commands/registry";
import { useAppStore } from "@/lib/store/app-store";
import { askConfirm, updateSettings } from "@/lib/store/ui-actions";

/** Every command with its key, and a recorder to change it. Renders in any container. */
export function KeybindingEditor({ className }: { className?: string }) {
  const commands = useCommands();
  const keybindings = useAppStore((state) => state.settings.keybindings);
  const globalShortcut = useAppStore((state) => state.settings.globalShortcut);
  const [filter, setFilter] = useState("");
  const [edit, setEdit] = useState<KeybindingEdit | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const rows = groupCommands(filterCommands(commands, keybindings, filter)).flatMap(
    (entry) => entry.commands,
  );
  const showGlobal = matchesFilter([GLOBAL_SHORTCUT_TITLE, globalShortcut ?? ""], filter);
  const customised =
    Object.keys(keybindings).length > 0 || globalShortcut !== DEFAULT_GLOBAL_SHORTCUT;

  const titleOf = (target: string) =>
    target === GLOBAL_SHORTCUT_ID
      ? "the global shortcut"
      : (commands.find((command) => command.id === target)?.title ?? target);

  function apply(target: string, key: string) {
    if (target === GLOBAL_SHORTCUT_ID) {
      updateSettings({
        keybindings: releaseKey(commands, keybindings, key),
        globalShortcut: key === "" ? null : key,
      });
    } else {
      updateSettings({ keybindings: bindKey(commands, keybindings, target, key) });
    }
    setEdit(null);
    setAnnouncement(
      key === ""
        ? `Removed the shortcut for ${titleOf(target)}.`
        : `Bound ${key} to ${titleOf(target)}.`,
    );
  }

  function propose(target: string, key: string) {
    const verdict = judgeKey({ commands, overrides: keybindings, globalShortcut }, target, key);
    if (verdict.kind === "ok") {
      apply(target, key);
    } else if (verdict.kind === "rejected") {
      setEdit({ target, problem: verdict.reason });
      setAnnouncement(`Not bound. ${verdict.reason}`);
    } else {
      const holders = verdict.others.map((command) => command.title).join(", ");
      const message = `${key} is already used by ${holders}.`;
      setEdit({ target, conflict: { key, message } });
      setAnnouncement(`${message} Choose Replace or Cancel.`);
    }
  }

  async function resetAll() {
    if (!customised) {
      setAnnouncement("Every shortcut is already at its default.");
      return;
    }
    const confirmed = await askConfirm(
      "Reset every shortcut to its default? Your custom shortcuts, the global one included, will be replaced.",
      "Reset all shortcuts",
    );
    if (!confirmed) return;
    updateSettings({ keybindings: {}, globalShortcut: DEFAULT_GLOBAL_SHORTCUT });
    setEdit(null);
    setAnnouncement("All shortcuts are back to their defaults.");
  }

  const rowProps = (target: string, defaultKey: string) => {
    const mine = edit?.target === target ? edit : null;
    const conflict = mine?.conflict;
    return {
      recording: mine !== null && conflict === undefined,
      problem: mine?.problem,
      conflict: conflict?.message,
      onStart: () => setEdit({ target }),
      onStop: () => setEdit(null),
      onKey: (key: string) => propose(target, key),
      onReplace: () => {
        if (conflict) apply(target, conflict.key);
      },
      onReset: () => propose(target, defaultKey),
    };
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-0 flex-1 basis-48">
          <span className="sr-only">Filter commands</span>
          <input
            type="text"
            className="ks-input"
            spellCheck={false}
            placeholder="Filter by command or key"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </label>
        <button type="button" className="ks-button shrink-0" onClick={() => void resetAll()}>
          Reset all shortcuts
        </button>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {rows.length === 0 && !showGlobal ? (
        <p className="py-6 text-center text-muted text-sm">
          No command matches "{filter.trim()}". Try part of a command name or a key such as Ctrl.
        </p>
      ) : (
        <ul className="text-sm">
          {showGlobal ? (
            <KeybindingRow
              title={GLOBAL_SHORTCUT_TITLE}
              detail="Anywhere in Windows"
              currentKey={globalShortcut ?? undefined}
              overridden={globalShortcut !== DEFAULT_GLOBAL_SHORTCUT}
              {...rowProps(GLOBAL_SHORTCUT_ID, DEFAULT_GLOBAL_SHORTCUT ?? "")}
            />
          ) : null}
          {rows.map((command) => (
            <KeybindingRow
              key={command.id}
              title={command.title}
              detail={command.group}
              currentKey={keyFor(command, keybindings)}
              overridden={command.id in keybindings}
              {...rowProps(command.id, command.defaultKey ?? "")}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
