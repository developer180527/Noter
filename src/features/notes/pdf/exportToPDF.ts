// src/features/notes/pdf/exportToPDF.ts
import { createElement, type ReactElement } from "react";
import { pdf }           from "@react-pdf/renderer";
import { registerFonts } from "./fonts";
import { NotePDF }       from "./NotePDF";

interface ExportOptions {
  note:       any;
  noteStore?: any;
}

export async function exportToPDF({ note, noteStore }: ExportOptions): Promise<void> {
  // Register fonts once
  registerFonts();

  // Build the document element — typed as ReactElement to satisfy pdf()
  const element: ReactElement = createElement(NotePDF, { note, noteStore });

  // Generate PDF blob entirely in JS — no network, no sidecar, fully offline
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

// ── Tauri — native Save As dialog ─────────────────────────────────────────────

async function saveTauri(blob: Blob, filename: string): Promise<void> {
  const { save }      = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");

  const path = await save({
    defaultPath: filename,
    filters: [{ name: "PDF Document", extensions: ["pdf"] }],
  });

  if (!path) return; // user cancelled

  const buffer = await blob.arrayBuffer();
  await writeFile(path, new Uint8Array(buffer));
}

// ── Browser / PWA — anchor download ──────────────────────────────────────────

function saveBrowser(blob: Blob, filename: string): void {
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}