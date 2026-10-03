import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useCommands } from "@/hooks/use-commands";
import { filterCommands, matchesFilter } from "@/lib/command-ui/command-filter";
import { groupCommands } from "@/lib/command-ui/command-groups";
import { GLOBAL_SHORTCUT_TITLE } from "@/lib/command-ui/keybindings";
import { closeIfCurrent, switchOverlay } from "@/lib/command-ui/picker-actions";
import { keyFor } from "@/lib/commands/registry";
import { useAppStore } from "@/lib/store/app-store";
import "@/styles/command.css";

const ROW = "flex items-center justify-between gap-3 py-0.5";
const HEADING = "mb-1 text-muted text-xs";

function ShortcutSheetBody() {
  const [filter, setFilter] = useState("");
  const commands = useCommands();
  const keybindings = useAppStore((state) => state.settings.keybindings);
  const globalShortcut = useAppStore((state) => state.settings.globalShortcut);

  const matches = filterCommands(commands, keybindings, filter);
  const bound = matches.filter((command) => keyFor(command, keybindings) !== undefined);
  const unbound = matches.filter((command) => keyFor(command, keybindings) === undefined);
  const showGlobal =
    globalShortcut !== null && matchesFilter([GLOBAL_SHORTCUT_TITLE, globalShortcut], filter);
  const nothing = matches.length === 0 && !showGlobal;

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-border border-b p-3">
        <h2 className="sr-only">Keyboard shortcuts</h2>
        {/* First focusable element in the dialog, so showModal() puts the caret here. */}
        <label className="min-w-0 flex-1 basis-48">
          <span className="sr-only">Filter shortcuts</span>
          <input
            type="text"
            className="ks-input"
            spellCheck={false}
            placeholder="Filter by command or key"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="ks-button shrink-0"
          onClick={() => switchOverlay("settings")}
        >
          Customise shortcuts
        </button>
      </div>
      <div className="selectable min-h-0 flex-1 overflow-y-auto p-4 text-sm">
        {nothing ? (
          <p className="py-6 text-center text-muted">
            No command matches "{filter.trim()}". Try part of a command name or a key such as Ctrl.
          </p>
        ) : null}
        <div className="ks-shortcut-columns">
          {groupCommands(bound).map((entry) => (
            <section key={entry.group} className="ks-shortcut-group">
              <h3 className={HEADING}>{entry.group}</h3>
              <ul>
                {entry.commands.map((command) => (
                  <li key={command.id} className={ROW}>
                    <span className="min-w-0">{command.title}</span>
                    <kbd className="ks-kbd shrink-0">{keyFor(command, keybindings)}</kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {showGlobal ? (
            <section className="ks-shortcut-group">
              <h3 className={HEADING}>Anywhere in Windows</h3>
              <p className={ROW}>
                <span className="min-w-0">{GLOBAL_SHORTCUT_TITLE}</span>
                <kbd className="ks-kbd shrink-0">{globalShortcut}</kbd>
              </p>
            </section>
          ) : null}
        </div>
        {unbound.length > 0 ? (
          <details>
            <summary className="ks-shortcut-summary rounded-control text-muted">
              Commands without a shortcut ({unbound.length})
            </summary>
            <ul className="ks-shortcut-columns mt-2">
              {unbound.map((command) => (
                <li key={command.id} className="py-0.5">
                  {command.title}
                  <span className="text-muted text-xs"> {command.group}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </>
  );
}

/** A read-only cheat sheet of every bound command. Editing happens in settings. */
export function ShortcutSheet() {
  const open = useAppStore((state) => state.overlay === "shortcuts");

  return (
    <Modal
      open={open}
      onClose={() => closeIfCurrent("shortcuts")}
      label="Keyboard shortcuts"
      className="ks-modal-wide"
    >
      <ShortcutSheetBody />
    </Modal>
  );
}
