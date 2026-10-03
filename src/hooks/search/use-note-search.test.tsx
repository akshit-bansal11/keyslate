import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useNoteSearch } from "@/hooks/search/use-note-search";
import type { SearchHit } from "@/lib/backend/note-schemas";

const search = vi.hoisted(() => vi.fn<(query: string) => Promise<SearchHit[]>>());
vi.mock("@/lib/backend/get-backend", () => ({ getBackend: () => ({ search }) }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Probe({ query }: { query: string }) {
  return JSON.stringify(useNoteSearch(query));
}

const hit = (snippet: string): SearchHit => ({ id: "a.md", title: "a", line: 1, snippet });
const pending = new Map<string, (hits: SearchHit[]) => void>();
const container = document.createElement("div");
let root = createRoot(container);

const show = (query: string) => act(() => root.render(<Probe query={query} />));
const wait = () => act(() => void vi.advanceTimersByTime(150));
const answer = (query: string) => act(async () => pending.get(query)?.([hit(query)]));
const shown = (): unknown => JSON.parse(container.textContent);

beforeEach(() => {
  vi.useFakeTimers();
  pending.clear();
  search.mockReset();
  search.mockImplementation((query) => new Promise((resolve) => pending.set(query, resolve)));
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
});

it("is idle for a blank query and waits out the debounce", () => {
  show("  ");
  expect(shown()).toMatchObject({ status: "idle" });
  show("a");
  show("ab");
  expect(search).not.toHaveBeenCalled();
  wait();
  expect(search.mock.calls).toEqual([["ab"]]);
  expect(shown()).toMatchObject({ status: "searching" });
});

it("never lets a slower earlier response replace a newer one", async () => {
  show("a");
  wait();
  show("ab");
  wait();
  await answer("ab");
  await answer("a");
  expect(shown()).toMatchObject({ status: "done", hits: [{ snippet: "ab" }] });
});

it("reports a failed search with the backend's message", async () => {
  search.mockRejectedValue("The vault folder is missing.");
  show("a");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(150);
  });
  expect(shown()).toMatchObject({ status: "error", error: "The vault folder is missing." });
});
