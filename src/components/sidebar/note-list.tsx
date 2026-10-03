import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { NoteRow } from "@/components/sidebar/note-row";
import { useCommandKey } from "@/hooks/use-command-key";
import { cn } from "@/lib/cn";
import { executeCommand } from "@/lib/commands/execute";
import { nextIndex } from "@/lib/sidebar/list-navigation";
import { formatRelativeTime } from "@/lib/sidebar/relative-time";
import {
  FALLBACK_PAGE,
  NOW_REFRESH_MS,
  SKELETON_TITLE_WIDTHS,
  VIEW_LIST_LABEL,
  VIEW_NOUN,
} from "@/lib/sidebar/sidebar-constants";
import { useAppStore } from "@/lib/store/app-store";
import { deleteNoteForever, openNote, restoreNote, trashNote } from "@/lib/store/note-actions";
import { setView } from "@/lib/store/ui-actions";
import { visibleNotes } from "@/lib/store/visible-notes";

interface NoteListProps {
  /** A printable key was pressed on a row: the filter takes it from here. */
  onTypeAhead: (character: string) => void;
}

function rowOf(target: EventTarget): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>("[data-id]") : null;
}

function restore(id: string) {
  void restoreNote(id).then(() => executeCommand("editor.focus"));
}

/** The note list as a listbox with roving focus, plus its loading and empty states. */
export function NoteList({ onTypeAhead }: NoteListProps) {
  const ready = useAppStore((state) => state.ready);
  const notes = useAppStore((state) => state.notes);
  const trash = useAppStore((state) => state.trash);
  const view = useAppStore((state) => state.view);
  const tagFilter = useAppStore((state) => state.tagFilter);
  const filterText = useAppStore((state) => state.filterText);
  const sort = useAppStore((state) => state.settings.sort);
  const activeId = useAppStore((state) => state.activeId);
  const newKey = useCommandKey("note.new");
  const pinKey = useCommandKey("note.togglePin");

  const [cursorId, setCursorId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  const removedId = useRef<string | null>(null);
  const hintId = useId();

  const rows = useMemo(
    () => visibleNotes({ notes, trash, view, tagFilter, filterText, sort }),
    [notes, trash, view, tagFilter, filterText, sort],
  );
  const edited = useMemo(
    () => rows.map((note) => formatRelativeTime(note.modified, now)),
    [rows, now],
  );

  const trashed = view === "trash";
  const needle = filterText.trim();
  const tabbableId =
    [cursorId, activeId].find((id) => rows.some((note) => note.id === id)) ?? rows[0]?.id;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), NOW_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // A row that was just trashed or deleted took focus with it; hand it to the
  // neighbour, unless the user has already moved on to something else.
  useEffect(() => {
    const removed = removedId.current;
    if (removed === null || rows.some((note) => note.id === removed)) return;
    removedId.current = null;
    const list = listRef.current;
    if (document.activeElement === document.body || list?.contains(document.activeElement)) {
      list?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    }
  }, [rows]);

  function remove(id: string) {
    const index = rows.findIndex((note) => note.id === id);
    removedId.current = id;
    setCursorId((rows[index + 1] ?? rows[index - 1])?.id ?? null);
    void (trashed ? deleteNoteForever(id) : trashNote(id));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
    // A key pressed on a row's button belongs to that button.
    const row = event.target instanceof HTMLElement ? event.target : null;
    const id = row?.dataset.id;
    if (!row || id === undefined) return;

    const page =
      row.offsetHeight > 0
        ? Math.max(1, Math.floor(event.currentTarget.clientHeight / row.offsetHeight) - 1)
        : FALLBACK_PAGE;
    const index = rows.findIndex((note) => note.id === id);
    const to = nextIndex(event.key, index, rows.length, page);
    if (to !== null) {
      event.preventDefault();
      const next = event.currentTarget.children[to];
      if (next instanceof HTMLElement) next.focus();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (trashed) restore(id);
      else void openNote(id).then(() => executeCommand("editor.focus"));
    } else if (event.key === "Delete") {
      event.preventDefault();
      remove(id);
    } else if (event.key === " ") {
      // Opens without leaving the list, so notes can be looked through in place.
      event.preventDefault();
      if (!trashed) void openNote(id);
    } else if (event.key.length === 1) {
      event.preventDefault();
      onTypeAhead(event.key);
    }
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    const id = rowOf(event.target)?.dataset.id;
    if (id === undefined || !(event.target instanceof Element)) return;
    const action = event.target.closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action === "restore") restore(id);
    else if (action === "delete") remove(id);
    else if (!trashed) void openNote(id);
  }

  function onFocus(event: FocusEvent<HTMLDivElement>) {
    const id = rowOf(event.target)?.dataset.id;
    if (id !== undefined) setCursorId(id);
  }

  let status = "Loading notes";
  if (ready) status = `${rows.length} ${rows.length === 1 ? "note" : "notes"} shown`;

  let body = (
    <ul aria-hidden="true" className="min-h-0 flex-1 overflow-hidden">
      {SKELETON_TITLE_WIDTHS.map((width) => (
        <li
          key={width}
          className="ks-note-row flex items-center border-transparent border-l-2 px-2"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className={cn("h-3 rounded-control bg-hover", width)} />
            <span className="h-2 w-1/4 rounded-control bg-hover" />
          </div>
        </li>
      ))}
    </ul>
  );

  if (ready && rows.length > 0) {
    body = (
      <div
        ref={listRef}
        role="listbox"
        aria-label={VIEW_LIST_LABEL[view]}
        aria-describedby={hintId}
        className="min-h-0 flex-1 overflow-y-auto"
        onKeyDown={onKeyDown}
        onClick={onClick}
        onFocus={onFocus}
      >
        {rows.map((note, index) => (
          <NoteRow
            key={note.id}
            note={note}
            edited={edited[index] ?? ""}
            selected={!trashed && note.id === activeId}
            tabbable={note.id === tabbableId}
            trashed={trashed}
          />
        ))}
      </div>
    );
  } else if (ready) {
    let message = "This vault has no notes yet.";
    let action = null;
    if (needle !== "" || tagFilter !== null) {
      const filters = [
        needle === "" ? null : `"${needle}"`,
        tagFilter === null ? null : `the tag ${tagFilter}`,
      ].filter((part) => part !== null);
      message = `No ${VIEW_NOUN[view]} match ${filters.join(" and ")}.`;
      action = (
        <button
          type="button"
          className="ks-button"
          onClick={() => executeCommand("sidebar.clearFilter")}
        >
          Clear filter
        </button>
      );
    } else if (trashed) {
      message = "The trash is empty.";
    } else if (view === "pinned") {
      message = "No pinned notes.";
      action = (
        <>
          {pinKey ? (
            <p>
              Press <kbd className="ks-kbd">{pinKey}</kbd> to pin the open note.
            </p>
          ) : null}
          <button type="button" className="ks-button" onClick={() => setView("all")}>
            Show all notes
          </button>
        </>
      );
    } else if (newKey) {
      action = (
        <p>
          Press <kbd className="ks-kbd">{newKey}</kbd> to start one.
        </p>
      );
    }
    body = (
      <div className="flex min-h-0 flex-1 flex-col items-start gap-2 overflow-y-auto p-3 text-muted text-sm">
        <p className="selectable">{message}</p>
        {action}
      </div>
    );
  }

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
      {trashed && trash.length > 0 ? (
        <div className="flex shrink-0 justify-end px-2 pb-2">
          <button
            type="button"
            className="ks-button border-danger text-danger"
            onClick={() => executeCommand("trash.empty")}
          >
            Empty trash
          </button>
        </div>
      ) : null}
      <p id={hintId} className={cn("px-2 pb-1 text-muted text-xs", !trashed && "sr-only")}>
        {trashed
          ? "Enter restores a note. Delete removes it permanently."
          : "Enter opens a note. Delete moves it to the trash."}
      </p>
      {body}
    </>
  );
}
