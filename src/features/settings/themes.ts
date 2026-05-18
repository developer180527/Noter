// src/features/settings/themes.ts
// Each theme is defined by its CSS variable values and a preview palette
// used to render the theme picker swatches in the settings UI.

export interface Theme {
  id:          string;
  name:        string;
  description: string;
  dark:        boolean;   // used to set <meta name="color-scheme">
  preview: {
    base:    string;  // background swatch
    surface: string;  // card swatch
    ink:     string;  // text swatch
    accent:  string;  // accent dot
    border:  string;  // border line
  };
}

export const THEMES: Theme[] = [
  {
    id:          "dark",
    name:        "Dark",
    description: "Deep obsidian with amber accents",
    dark:        true,
    preview: { base: "#0d0d0d", surface: "#1a1a1a", ink: "#e8e0d5", accent: "#d4903a", border: "#2a2a2a" },
  },
  {
    id:          "metallic",
    name:        "Metallic",
    description: "Polished steel with cool blue highlights",
    dark:        true,
    preview: { base: "#111113", surface: "#222226", ink: "#e8e8f0", accent: "#a8c7fa", border: "#38383f" },
  },
  {
    id:          "rose",
    name:        "Rose",
    description: "Deep crimson with soft pink warmth",
    dark:        true,
    preview: { base: "#120d0f", surface: "#221519", ink: "#f0e4e8", accent: "#e88fa8", border: "#3a2429" },
  },
  {
    id:          "nord",
    name:        "Nord",
    description: "Nordic blue-grey with arctic clarity",
    dark:        true,
    preview: { base: "#2e3440", surface: "#3b4252", ink: "#eceff4", accent: "#88c0d0", border: "#4c566a" },
  },
  {
    id:          "sepia",
    name:        "Sepia",
    description: "Warm paper tones for long reading sessions",
    dark:        false,
    preview: { base: "#f5efe6", surface: "#e3dace", ink: "#2c2420", accent: "#8b5e3c", border: "#c8bfb0" },
  },
  {
    id:          "classic",
    name:        "Classic",
    description: "Y2K nostalgia — Windows XP era warmth",
    dark:        false,
    preview: { base: "#ece9d8", surface: "#d4d0c8", ink: "#000080", accent: "#003087", border: "#aca899" },
  },
  {
    id:          "midnight",
    name:        "Midnight",
    description: "Deep navy for late-night focus sessions",
    dark:        true,
    preview: { base: "#080c14", surface: "#141a2c", ink: "#c8d8f0", accent: "#7c9eff", border: "#263048" },
  },
  {
    id:          "forest",
    name:        "Forest",
    description: "Dark green canopy, earthy and calm",
    dark:        true,
    preview: { base: "#0a0f0b", surface: "#162218", ink: "#d0e8d2", accent: "#4caf7d", border: "#2a3c2c" },
  },
];

export const DEFAULT_THEME = "dark";