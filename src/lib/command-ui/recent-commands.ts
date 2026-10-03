const RECENT_LIMIT = 5;

/** In memory only: a restart starts with an empty list. */
let recent: readonly string[] = [];

export function rememberCommand(id: string) {
  recent = [id, ...recent.filter((entry) => entry !== id)].slice(0, RECENT_LIMIT);
}

/** Most recently run first. */
export function recentCommandIds(): readonly string[] {
  return recent;
}
