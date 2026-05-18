// src/features/export/exporters/pdf.ts
// PDF exporter — uses @react-pdf/renderer (fully offline, no sidecar).
// Wires into ExportMenu alongside html.ts and markdown.ts.

import { createElement, type ReactElement } from "react";
import { pdf }           from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { NotePDF }       from "./pdfDocument";

// ── Main export function ──────────────────────────────────────────────────────

export async function exportPdf(note: any, noteStore?: any): Promise<void> {
  registerFonts();

  const element: ReactElement = createElement(NotePDF, { note, noteStore });
  const blob     = await pdf(element).toBlob();
  const filename = sanitizeFilename(note.title || "untitled") + ".pdf";

  if (isTauri()) {
    await saveTauri(blob, filename);
  } else {
    saveBrowser(blob, filename);
  }
}

// ── Platform ──────────────────────────────────────────────────────────────────

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function saveTauri(blob: Blob, filename: string): Promise<void> {
  const { save }      = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  const path = await save({
    defaultPath: filename,
    filters: [{ name: "PDF Document", extensions: ["pdf"] }],
  });
  if (!path) return;
  const buffer = await blob.arrayBuffer();
  await writeFile(path, new Uint8Array(buffer));
}

function saveBrowser(blob: Blob, filename: string): void {
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim().slice(0, 100);
}