import type { Theme } from "@/lib/settings/settings-schema";

/*
 * The colour values of the app. Dark and light themes are authored side by
 * side as siblings, never by inverting one another. Each has exactly one accent
 * hue; `surface` and `raised` are lightness steps of `bg` in the same hue
 * family; neither end of the scale is pure black or pure white.
 *
 * Every pair is measured by builtin-themes.test.ts (see contrast.ts for the
 * targets). Change a value here and that sweep must still pass.
 */

/** The default, and the fallback when a saved theme id no longer exists. Amber matches the app icon. */
export const DEFAULT_THEME: Theme = {
  id: "slate",
  name: "Slate",
  scheme: "dark",
  colors: {
    bg: "#14181f",
    surface: "#1a1f28",
    raised: "#222834",
    border: "#3d4657",
    text: "#e3e7ee",
    muted: "#9aa4b5",
    accent: "#f5b83d",
    accentFg: "#1a1405",
    danger: "#ff8a80",
  },
};

export const BUILTIN_THEMES: readonly Theme[] = [
  DEFAULT_THEME,
  {
    id: "graphite",
    name: "Graphite",
    scheme: "dark",
    colors: {
      bg: "#161616",
      surface: "#1d1d1d",
      raised: "#262626",
      border: "#474747",
      text: "#e6e6e6",
      muted: "#a3a3a3",
      accent: "#4cc2c4",
      accentFg: "#06201f",
      danger: "#ff8f85",
    },
  },
  {
    id: "contrast-dark",
    name: "High contrast dark",
    scheme: "dark",
    colors: {
      bg: "#0a0a0a",
      surface: "#121212",
      raised: "#1c1c1c",
      border: "#6e6e6e",
      text: "#f7f7f7",
      muted: "#c9c9c9",
      accent: "#ffe14d",
      accentFg: "#141000",
      danger: "#ff9c94",
    },
  },
  {
    id: "paper",
    name: "Paper",
    scheme: "light",
    colors: {
      bg: "#f6f1e7",
      surface: "#ede6d8",
      raised: "#fbf8f1",
      border: "#c9bfab",
      text: "#2b2620",
      muted: "#62584b",
      accent: "#2a5a9a",
      accentFg: "#f7faff",
      danger: "#a3241b",
    },
  },
  {
    id: "sage",
    name: "Sage",
    scheme: "light",
    colors: {
      bg: "#f2f5f1",
      surface: "#e7ece6",
      raised: "#fafcf9",
      border: "#bfc9bf",
      text: "#1f2a24",
      muted: "#526057",
      accent: "#2f6f4f",
      accentFg: "#f4fbf6",
      danger: "#a8261e",
    },
  },
  {
    id: "contrast-light",
    name: "High contrast light",
    scheme: "light",
    colors: {
      bg: "#fafafa",
      surface: "#efefef",
      raised: "#fdfdfd",
      border: "#8a8a8a",
      text: "#111111",
      muted: "#444444",
      accent: "#0b3fa8",
      accentFg: "#f7faff",
      danger: "#9c1410",
    },
  },
];
