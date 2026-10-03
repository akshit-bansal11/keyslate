import type { Theme } from "@/lib/settings/settings-schema";

type Rgb = readonly [number, number, number];

const TEXT_MIN = 4.5;
/** Focus rings and selection markers: WCAG 2.2 SC 1.4.11. */
const NON_TEXT_MIN = 3;
/**
 * Borders here are decorative separators, not the only boundary of a control,
 * so they are held to "visible but quiet" rather than the 3:1 non-text bar.
 */
const BORDER_MIN = 1.3;
/** Mirrors `--color-control` in globals.css: text at 60% over the editor background. */
const CONTROL_ALPHA = 0.6;
/** Mirrors `--color-selected` in globals.css: the accent at 20% over the background. */
const SELECTED_ALPHA = 0.2;

const BACKGROUNDS = [
  { role: "bg", place: "the editor background" },
  { role: "surface", place: "the sidebar" },
  { role: "raised", place: "dialogs and inputs" },
] as const;

function toRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function linear(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: Rgb): number {
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

function ratio(a: Rgb, b: Rgb): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function blend(top: Rgb, under: Rgb, alpha: number): Rgb {
  const mix = (index: 0 | 1 | 2) => top[index] * alpha + under[index] * (1 - alpha);
  return [mix(0), mix(1), mix(2)];
}

/** WCAG 2.2 contrast ratio of two `#rrggbb` colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  return ratio(toRgb(a), toRgb(b));
}

/**
 * Every colour pair in a theme that falls short of its contrast target, as
 * plain sentences. Empty when the theme is readable everywhere it is painted.
 */
export function themeContrastIssues(theme: Theme): string[] {
  const { colors } = theme;
  const issues: string[] = [];
  const check = (what: string, fg: Rgb, bg: Rgb, minimum: number) => {
    const measured = ratio(fg, bg);
    // Floored, so a near miss never prints as the number it failed to reach.
    const shown = (Math.floor(measured * 100) / 100).toFixed(2);
    if (measured < minimum) issues.push(`${what} is ${shown}:1; it needs ${minimum}:1`);
  };

  const text = toRgb(colors.text);
  const accent = toRgb(colors.accent);
  const control = blend(text, toRgb(colors.bg), CONTROL_ALPHA);
  for (const { role, place } of BACKGROUNDS) {
    const bg = toRgb(colors[role]);
    check(`Main text on ${place}`, text, bg, TEXT_MIN);
    check(`Muted text on ${place}`, toRgb(colors.muted), bg, TEXT_MIN);
    check(`Danger text on ${place}`, toRgb(colors.danger), bg, TEXT_MIN);
    check(`The accent on ${place}`, accent, bg, NON_TEXT_MIN);
    check(`Button and field outlines on ${place}`, control, bg, NON_TEXT_MIN);
    check(`Borders on ${place}`, toRgb(colors.border), bg, BORDER_MIN);
    const selected = blend(accent, bg, SELECTED_ALPHA);
    check(`Main text on a selected row over ${place}`, text, selected, TEXT_MIN);
  }
  check("Text on the accent colour", toRgb(colors.accentFg), accent, TEXT_MIN);
  return issues;
}
