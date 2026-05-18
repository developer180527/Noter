// src/features/export/exporters/pdfFonts.ts
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

  Font.registerHyphenationCallback((word) => [word]);
}