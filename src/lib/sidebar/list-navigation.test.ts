import { expect, test } from "vitest";
import { nextIndex } from "@/lib/sidebar/list-navigation";

test("moves by one, by a page, and to the ends, without leaving the list", () => {
  expect(nextIndex("ArrowDown", 0, 5, 3)).toBe(1);
  expect(nextIndex("ArrowDown", 4, 5, 3)).toBe(4);
  expect(nextIndex("ArrowUp", 0, 5, 3)).toBe(0);
  expect(nextIndex("PageDown", 1, 5, 3)).toBe(4);
  expect(nextIndex("PageDown", 3, 5, 3)).toBe(4);
  expect(nextIndex("PageUp", 1, 5, 3)).toBe(0);
  expect(nextIndex("Home", 3, 5, 3)).toBe(0);
  expect(nextIndex("End", 0, 5, 3)).toBe(4);
});

test("ignores keys that do not navigate", () => {
  expect(nextIndex("Enter", 2, 5, 3)).toBeNull();
  expect(nextIndex("a", 2, 5, 3)).toBeNull();
});
