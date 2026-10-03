import { expect, test } from "vitest";
import { formatRelativeTime } from "@/lib/sidebar/relative-time";

const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute).getTime();
const NOW = at(3, 12);

test("formats by how long ago the edit was", () => {
  expect(formatRelativeTime(NOW - 30_000, NOW)).toBe("just now");
  expect(formatRelativeTime(NOW + 5_000, NOW)).toBe("just now");
  expect(formatRelativeTime(at(3, 11, 55), NOW)).toBe("5 min. ago");
  expect(formatRelativeTime(at(3, 9), NOW)).toBe("3 hr. ago");
  expect(formatRelativeTime(at(2, 23), NOW)).toBe("Yesterday");
});

test("an edit minutes ago stays in minutes across midnight", () => {
  expect(formatRelativeTime(at(2, 23, 50), at(3, 0, 10))).toBe("20 min. ago");
});

test("older edits show a date, with the year only when it differs", () => {
  const sameYear = formatRelativeTime(at(1, 12), NOW);
  expect(sameYear).toContain("1");
  expect(sameYear).not.toContain("2026");
  expect(formatRelativeTime(new Date(2024, 4, 17).getTime(), NOW)).toContain("2024");
});
