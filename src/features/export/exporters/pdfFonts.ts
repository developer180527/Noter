// src/features/export/exporters/pdfFonts.ts
//
// Fonts are fetched as base64 data URLs using window.location.origin.
// This works in both Tauri (tauri://localhost or https://tauri.localhost)
// and the browser (http://localhost or https://app.com).
// react-pdf receives data: URLs — zero network requests during PDF generation.

import { Font } from "@react-pdf/renderer";

let registrationPromise: Promise<void> | null = null;

// Convert a public/ font file to a base64 data URL
async function fontDataUrl(path: string): Promise<string> {
  const base = window.location.origin; // correct for both Tauri and browser
  const url  = `${base}${path}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url} (${res.status})`);
  const buf  = await res.arrayBuffer();
  const b64  = btoa(
    new Uint8Array(buf).reduce((acc, b) => acc + String.fromCharCode(b), "")
  );
  return `data:font/truetype;base64,${b64}`;
}

export function registerFonts(): Promise<void> {
  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    // Load all font files in parallel — fail fast with a clear error
    const [
      cpRegular, cpItalic, cpBold, cpBoldItalic, cpSemiBold,
      jbRegular, jbBold,
    ] = await Promise.all([
      fontDataUrl("/fonts/CrimsonPro-Regular.ttf"),
      fontDataUrl("/fonts/CrimsonPro-Italic.ttf"),
      fontDataUrl("/fonts/CrimsonPro-Bold.ttf"),
      fontDataUrl("/fonts/CrimsonPro-BoldItalic.ttf"),
      fontDataUrl("/fonts/CrimsonPro-SemiBold.ttf"),
      fontDataUrl("/fonts/JetBrainsMono-Regular.ttf"),
      fontDataUrl("/fonts/JetBrainsMono-Bold.ttf"),
    ]);

    Font.register({
      family: "CrimsonPro",
      fonts: [
        { src: cpRegular, fontWeight: "normal", fontStyle: "normal" },
        { src: cpItalic,  fontWeight: "normal", fontStyle: "italic" },
      ],
    });

    Font.register({
      family: "CrimsonPro-Bold",
      fonts: [{ src: cpBold, fontWeight: "bold" }],
    });

    Font.register({
      family: "CrimsonPro-SemiBold",
      fonts: [{ src: cpSemiBold, fontWeight: 600 }],
    });

    Font.register({
      family: "CrimsonPro-BoldItalic",
      fonts: [{ src: cpBoldItalic, fontWeight: "bold", fontStyle: "italic" }],
    });

    Font.register({
      family: "CrimsonPro-Italic",
      fonts: [{ src: cpItalic, fontWeight: "normal", fontStyle: "italic" }],
    });

    Font.register({
      family: "JetBrainsMono",
      fonts: [
        { src: jbRegular, fontWeight: "normal" },
        { src: jbBold,    fontWeight: "bold"   },
      ],
    });

    Font.registerHyphenationCallback((word) => [word]);
  })();

  // Reset promise on failure so next attempt retries from scratch
  registrationPromise.catch(() => { registrationPromise = null; });

  return registrationPromise;
}