// src/features/notes/pdf/fonts.ts
// Register fonts once globally for @react-pdf/renderer.
// Fonts must be present in public/fonts/ — see checklist at bottom.

import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerFonts(): void {
  if (registered) return;
  registered = true;

  Font.register({
    family: "JetBrainsMono",
    fonts: [
      { src: "/fonts/JetBrainsMono-Regular.ttf", fontWeight: "normal" },
      { src: "/fonts/JetBrainsMono-Bold.ttf",    fontWeight: "bold"   },
    ],
  });

  Font.register({
    family: "CrimsonPro",
    fonts: [
      { src: "/fonts/CrimsonPro-Regular.ttf", fontWeight: "normal", fontStyle: "normal" },
      { src: "/fonts/CrimsonPro-Italic.ttf",  fontWeight: "normal", fontStyle: "italic" },
    ],
  });

  Font.register({
    family: "CrimsonPro-Bold",
    fonts: [{ src: "/fonts/CrimsonPro-Bold.ttf", fontWeight: "bold" }],
  });

  Font.register({
    family: "CrimsonPro-SemiBold",
    fonts: [{ src: "/fonts/CrimsonPro-SemiBold.ttf", fontWeight: 600 }],
  });

  Font.register({
    family: "CrimsonPro-BoldItalic",
    fonts: [{ src: "/fonts/CrimsonPro-BoldItalic.ttf", fontWeight: "bold", fontStyle: "italic" }],
  });

  Font.register({
    family: "CrimsonPro-Italic",
    fonts: [{ src: "/fonts/CrimsonPro-Italic.ttf", fontWeight: "normal", fontStyle: "italic" }],
  });

  // Disable hyphenation for cleaner line breaks
  Font.registerHyphenationCallback((word) => [word]);
}

// ── Required font files in public/fonts/ ─────────────────────────────────────
// Download from Google Fonts:
//   https://fonts.google.com/specimen/Crimson+Pro  (download family)
//   https://fonts.google.com/specimen/JetBrains+Mono (download family)
//
// CrimsonPro-Regular.ttf
// CrimsonPro-Italic.ttf
// CrimsonPro-Bold.ttf
// CrimsonPro-BoldItalic.ttf
// CrimsonPro-SemiBold.ttf
// JetBrainsMono-Regular.ttf
// JetBrainsMono-Bold.ttf