const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const RELATIVE = new Intl.RelativeTimeFormat("en", { style: "short" });
const THIS_YEAR = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const OTHER_YEAR = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function startOfDay(time: number): number {
  return new Date(time).setHours(0, 0, 0, 0);
}

/**
 * "just now", "5 min. ago", "3 hr. ago", "Yesterday", then a short date.
 * Both arguments are milliseconds since the epoch. A time in the future (a
 * clock that moved, a file saved after `now` was sampled) reads as "just now".
 */
export function formatRelativeTime(then: number, now: number): string {
  const elapsed = now - then;
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return RELATIVE.format(-Math.floor(elapsed / MINUTE), "minute");
  // Rounded, because a day that contains a clock change is not 24 hours long.
  const days = Math.round((startOfDay(now) - startOfDay(then)) / DAY);
  if (days === 0) return RELATIVE.format(-Math.floor(elapsed / HOUR), "hour");
  if (days === 1) return "Yesterday";
  const sameYear = new Date(then).getFullYear() === new Date(now).getFullYear();
  return (sameYear ? THIS_YEAR : OTHER_YEAR).format(then);
}
