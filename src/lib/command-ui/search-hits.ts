import type { SearchHit } from "@/lib/backend/note-schemas";

export interface SnippetPart {
  /** Offset in the snippet; unique, so it serves as a render key. */
  start: number;
  text: string;
  match: boolean;
}

export interface HitGroup {
  id: string;
  title: string;
  hits: SearchHit[];
}

/** Cuts a snippet at every case-insensitive occurrence of the query, so the matches can be emphasised. */
export function splitSnippet(snippet: string, query: string): SnippetPart[] {
  const needle = query.trim();
  if (needle === "") return snippet === "" ? [] : [{ start: 0, text: snippet, match: false }];
  const pattern = new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  let start = 0;
  // With one capture group, `split` alternates plain text and matches.
  return snippet.split(pattern).flatMap((text, index) => {
    const part = { start, text, match: index % 2 === 1 };
    start += text.length;
    return text === "" ? [] : [part];
  });
}

/** Hits bucketed by note, in the order the backend returned them. */
export function groupHits(hits: readonly SearchHit[]): HitGroup[] {
  const groups = new Map<string, HitGroup>();
  for (const hit of hits) {
    const group = groups.get(hit.id);
    if (group) group.hits.push(hit);
    else groups.set(hit.id, { id: hit.id, title: hit.title, hits: [hit] });
  }
  return [...groups.values()];
}
