const WORD_START_BONUS = 3;
const CONSECUTIVE_BONUS = 2;
const PREFIX_BONUS = 2;
/** Small enough that it only breaks ties: the shorter of two equal matches wins. */
const LENGTH_PENALTY = 0.001;
/** Tags, group names and keys match, but never outrank an equal hit on the title. */
const SECONDARY_WEIGHT = 0.5;

function isWordStart(text: string, index: number): boolean {
  return index === 0 || !/[\p{L}\p{N}]/u.test(text[index - 1] ?? "");
}

function nextWordStart(text: string, char: string, from: number): number {
  for (let index = text.indexOf(char, from); index !== -1; index = text.indexOf(char, index + 1)) {
    if (isWordStart(text, index)) return index;
  }
  return -1;
}

function walk(text: string, needle: string, preferWordStarts: boolean): number {
  let score = 0;
  let from = 0;
  for (const char of needle) {
    let index = preferWordStarts ? nextWordStart(text, char, from) : -1;
    if (index === -1) index = text.indexOf(char, from);
    if (index === -1) return 0;
    score += 1;
    if (isWordStart(text, index)) score += WORD_START_BONUS;
    if (from > 0 && index === from) score += CONSECUTIVE_BONUS;
    if (index === 0) score += PREFIX_BONUS;
    from = index + char.length;
  }
  return score;
}

/**
 * Subsequence match, case-insensitive, ignoring spaces in the query. Zero means
 * no match; higher is better. Prefix, word-start and consecutive hits rank up.
 */
export function fuzzyScore(text: string, query: string): number {
  const needle = query.toLowerCase().replace(/\s+/g, "");
  if (needle === "") return 1;
  const haystack = text.toLowerCase();
  // ponytail: two greedy passes, not the optimal alignment. Swap in a DP scorer
  // if a query ever ranks an obviously worse title first.
  const score = Math.max(walk(haystack, needle, false), walk(haystack, needle, true));
  return score === 0 ? 0 : Math.max(score - haystack.length * LENGTH_PENALTY, LENGTH_PENALTY);
}

/**
 * Items that match the query, best first. `texts` returns the primary text
 * followed by any secondary ones. An empty query keeps every item in order.
 */
export function fuzzyRank<T>(
  items: readonly T[],
  query: string,
  texts: (item: T) => readonly string[],
): T[] {
  if (query.trim() === "") return [...items];
  return items
    .map((item) => {
      const [primary = "", ...secondary] = texts(item);
      const scores = secondary.map((text) => fuzzyScore(text, query) * SECONDARY_WEIGHT);
      return { item, score: Math.max(fuzzyScore(primary, query), ...scores) };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
