import { Command } from "cmdk";
import { useState } from "react";
import { Picker } from "@/components/command/picker";
import { Modal } from "@/components/ui/modal";
import { type NoteSearch, useNoteSearch } from "@/hooks/search/use-note-search";
import { closeIfCurrent, openNoteFromPicker } from "@/lib/command-ui/picker-actions";
import { groupHits, splitSnippet } from "@/lib/command-ui/search-hits";
import { useAppStore } from "@/lib/store/app-store";

function statusLine(search: NoteSearch, noteCount: number): string {
  if (search.status === "idle") return "";
  if (search.status === "searching") return "Searching";
  if (search.status === "error") return "Search failed";
  const matches = search.hits.length;
  if (matches === 0) return "No matches";
  return `${matches} ${matches === 1 ? "match" : "matches"} in ${noteCount} ${noteCount === 1 ? "note" : "notes"}`;
}

function emptyText(search: NoteSearch, query: string): string {
  if (search.status === "idle") return "Type to search the titles and text of every note.";
  if (search.status === "searching") return "Searching";
  if (search.status === "error") {
    return `The search could not finish. ${search.error ?? ""} Change the search text to try again.`;
  }
  return `No note contains "${query.trim()}". Check the spelling or try a shorter phrase.`;
}

function SearchBody() {
  const [query, setQuery] = useState("");
  const search = useNoteSearch(query);
  const groups = groupHits(search.hits);

  return (
    <Picker
      label="Search in all notes"
      placeholder="Search in all notes"
      query={query}
      onQueryChange={setQuery}
      empty={emptyText(search, query)}
      status={statusLine(search, groups.length)}
    >
      {groups.map((group) => (
        <Command.Group key={group.id} heading={group.title}>
          {group.hits.map((hit) => (
            <Command.Item
              key={hit.line}
              value={`${hit.id}:${hit.line}`}
              onSelect={() => openNoteFromPicker(hit.id, hit.line > 0 ? hit.line : null)}
            >
              {hit.line > 0 ? (
                <>
                  <span className="ks-picker-line shrink-0 font-mono text-muted text-xs">
                    <span className="sr-only">Line </span>
                    {hit.line}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {splitSnippet(hit.snippet, query).map((part) =>
                      part.match ? (
                        <strong key={part.start} className="font-semibold underline">
                          {part.text}
                        </strong>
                      ) : (
                        part.text
                      ),
                    )}
                  </span>
                </>
              ) : (
                <span className="text-muted">Title match</span>
              )}
            </Command.Item>
          ))}
        </Command.Group>
      ))}
    </Picker>
  );
}

/** Full-text search across the vault. Enter opens the note at the matching line. */
export function SearchDialog() {
  const open = useAppStore((state) => state.overlay === "search");

  return (
    <Modal
      open={open}
      onClose={() => closeIfCurrent("search")}
      label="Search in all notes"
      placement="top"
    >
      <SearchBody />
    </Modal>
  );
}
