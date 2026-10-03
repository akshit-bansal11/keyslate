import { Plus } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef } from "react";
import { NoteList } from "@/components/sidebar/note-list";
import { useCommandKey } from "@/hooks/use-command-key";
import { cn } from "@/lib/cn";
import { executeCommand } from "@/lib/commands/execute";
import { registerCommands } from "@/lib/commands/registry";
import { VIEWS } from "@/lib/sidebar/sidebar-constants";
import { useAppStore } from "@/lib/store/app-store";
import { setFilterText, setTagFilter, setView } from "@/lib/store/ui-actions";
import { tagCounts } from "@/lib/store/visible-notes";
import "@/styles/sidebar.css";

const TOGGLE_CLASS =
  "ks-sidebar-target flex items-center justify-center gap-1 rounded-control border px-1.5 hover:bg-hover";
const PRESSED_CLASS = "border-accent bg-selected font-semibold";

/** Focuses the first row matching `selector`. False when the list has no such row. */
function focusRow(nav: HTMLElement | null, selector: string): boolean {
  const row = nav?.querySelector<HTMLElement>(selector);
  row?.focus();
  return row != null;
}

/** The note list column: new note, filter, view switch, tags, the list, the vault path. */
export function Sidebar() {
  const notes = useAppStore((state) => state.notes);
  const trashCount = useAppStore((state) => state.trash.length);
  const view = useAppStore((state) => state.view);
  const tagFilter = useAppStore((state) => state.tagFilter);
  const filterText = useAppStore((state) => state.filterText);
  const vaultPath = useAppStore((state) => state.vaultPath);
  const newKey = useCommandKey("note.new");
  const navRef = useRef<HTMLElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const tags = useMemo(() => tagCounts(notes), [notes]);
  const counts = {
    all: notes.length,
    pinned: notes.filter((note) => note.pinned).length,
    trash: trashCount,
  };

  useEffect(
    () =>
      registerCommands([
        {
          id: "sidebar.focus",
          title: "Focus the note list",
          group: "Go",
          defaultKey: "Alt+L",
          run: () => {
            const nav = navRef.current;
            if (focusRow(nav, '[role="option"][aria-selected="true"]')) return;
            if (!focusRow(nav, '[role="option"]')) filterRef.current?.focus();
          },
        },
        {
          id: "sidebar.filter",
          title: "Filter notes",
          group: "Go",
          defaultKey: "Alt+F",
          run: () => {
            filterRef.current?.focus();
            filterRef.current?.select();
          },
        },
        {
          id: "sidebar.clearFilter",
          title: "Clear note filter",
          group: "Go",
          run: () => {
            setFilterText("");
            setTagFilter(null);
          },
        },
      ]),
    [],
  );

  function onFilterKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && filterText !== "") {
      event.preventDefault();
      setFilterText("");
    } else if (event.key === "Escape" || event.key === "ArrowDown") {
      event.preventDefault();
      focusRow(navRef.current, '[role="option"]');
    }
  }

  return (
    <nav
      ref={navRef}
      aria-label="Notes"
      className="ks-sidebar flex h-full shrink-0 flex-col border-border border-r bg-surface"
    >
      <div className="flex shrink-0 flex-col gap-2 p-2">
        <button
          type="button"
          className="ks-button w-full justify-between"
          onClick={() => executeCommand("note.new")}
        >
          <span className="flex items-center gap-1.5">
            <Plus aria-hidden="true" focusable="false" className="size-4" />
            New note
          </span>
          {newKey ? <kbd className="ks-kbd">{newKey}</kbd> : null}
        </button>
        <label className="block">
          <span className="sr-only">Filter notes</span>
          <input
            ref={filterRef}
            type="text"
            className="ks-input"
            placeholder="Filter notes"
            autoComplete="off"
            spellCheck={false}
            value={filterText}
            onChange={(event) => setFilterText(event.target.value)}
            onKeyDown={onFilterKeyDown}
          />
        </label>
        <fieldset className="flex min-w-0 gap-1">
          <legend className="sr-only">Show</legend>
          {VIEWS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              className={cn(
                TOGGLE_CLASS,
                "min-w-0 flex-1 text-sm",
                view === id ? PRESSED_CLASS : "border-transparent",
              )}
              onClick={() => setView(id)}
            >
              <span className="truncate">{label}</span>
              <span className="text-muted text-xs">{counts[id]}</span>
            </button>
          ))}
        </fieldset>
        {tags.length > 0 ? (
          <fieldset className="flex max-h-20 min-w-0 flex-wrap gap-1 overflow-y-auto">
            <legend className="sr-only">Filter by tag</legend>
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                aria-pressed={tagFilter === tag}
                className={cn(
                  TOGGLE_CLASS,
                  "max-w-full text-xs",
                  tagFilter === tag ? PRESSED_CLASS : "border-border",
                )}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              >
                <span className="truncate">#{tag}</span>
                <span className="text-muted">{count}</span>
              </button>
            ))}
          </fieldset>
        ) : null}
      </div>
      <NoteList
        onTypeAhead={(character) => {
          setFilterText(filterText + character);
          filterRef.current?.focus();
        }}
      />
      <button
        type="button"
        title={vaultPath}
        className="ks-sidebar-target block w-full shrink-0 border-border border-t px-2 text-left text-muted text-xs hover:bg-hover"
        onClick={() => executeCommand("vault.reveal")}
      >
        <span className="sr-only">Open vault folder in Explorer: </span>
        <span className="ks-path block">
          <bdi dir="ltr">{vaultPath === "" ? "Vault folder" : vaultPath}</bdi>
        </span>
      </button>
    </nav>
  );
}
