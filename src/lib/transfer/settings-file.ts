import { parseSettings, type Settings, settingsSchema } from "@/lib/settings/settings-schema";

const KNOWN_KEYS = Object.keys(settingsSchema.shape);

/**
 * Reads an exported settings file. Null when the text is not a settings
 * object at all; unknown or bad fields inside one fall back field by field.
 * The vault stays where it is: an imported file must never move the notes.
 */
export function parseSettingsFile(text: string, current: Settings): Settings | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  // An unrelated JSON object would otherwise parse as "every setting at its default".
  if (!KNOWN_KEYS.some((key) => key !== "vaultPath" && key in raw)) return null;
  return { ...parseSettings(raw), vaultPath: current.vaultPath };
}
