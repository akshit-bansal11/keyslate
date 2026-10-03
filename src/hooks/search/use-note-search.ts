import { useEffect, useState } from "react";
import { getBackend } from "@/lib/backend/get-backend";
import type { SearchHit } from "@/lib/backend/note-schemas";
import { errorMessage } from "@/lib/error-message";

const SEARCH_DEBOUNCE_MS = 150;

export interface NoteSearch {
  status: "idle" | "searching" | "done" | "error";
  /** While searching, the hits of the previous query, so the list does not blink. */
  hits: SearchHit[];
  error: string | null;
}

interface Settled {
  query: string;
  hits: SearchHit[];
  error: string | null;
}

const IDLE: NoteSearch = { status: "idle", hits: [], error: null };

/** Full-text search across the vault, debounced. A slow earlier answer never replaces a newer one. */
export function useNoteSearch(query: string): NoteSearch {
  const needle = query.trim();
  const [settled, setSettled] = useState<Settled>({ query: "", hits: [], error: null });

  useEffect(() => {
    if (needle === "") return;
    let stale = false;
    const timer = setTimeout(() => {
      getBackend()
        .search(needle)
        .then(
          (hits) => {
            if (!stale) setSettled({ query: needle, hits, error: null });
          },
          (error: unknown) => {
            if (!stale) setSettled({ query: needle, hits: [], error: errorMessage(error) });
          },
        );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [needle]);

  if (needle === "") return IDLE;
  if (settled.query !== needle) return { status: "searching", hits: settled.hits, error: null };
  return {
    status: settled.error === null ? "done" : "error",
    hits: settled.hits,
    error: settled.error,
  };
}
