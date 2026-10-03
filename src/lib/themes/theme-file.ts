import { type Theme, themeSchema } from "@/lib/settings/settings-schema";

const ID_MAX = 64;

export type ThemeFileResult = { theme: Theme } | { error: string };

/** `base` if it is free, otherwise `base-2`, `base-3`, and so on. */
export function uniqueThemeId(base: string, taken: readonly string[]): string {
  if (!taken.includes(base)) return base;
  // Room for the suffix inside the schema's id limit.
  const stem = base.slice(0, ID_MAX - 8);
  let count = 2;
  while (taken.includes(`${stem}-${count}`)) count += 1;
  return `${stem}-${count}`;
}

/**
 * Reads a `.keyslate-theme.json` file. The file comes from outside the app, so
 * it is validated in full; the error names the field that is wrong.
 */
export function parseThemeFile(text: string, takenIds: readonly string[]): ThemeFileResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: "That file is not valid JSON, so it cannot be a Keyslate theme." };
  }
  const parsed = themeSchema.safeParse(raw);
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    const field = issue?.path.join(".") || "the file";
    const reason = field.startsWith("colors.")
      ? "must be a six-digit hex colour such as #1a2b3c"
      : "is missing or not valid";
    return { error: `This theme cannot be imported: "${field}" ${reason}.` };
  }
  return { theme: { ...parsed.data, id: uniqueThemeId(parsed.data.id, takenIds) } };
}
