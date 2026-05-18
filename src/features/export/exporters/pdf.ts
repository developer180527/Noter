// src/features/export/exporters/pdf.ts
// PDF exporter — uses @react-pdf/renderer (fully offline, no sidecar).
// Wires into ExportMenu alongside html.ts and markdown.ts.

import { createElement, type ReactElement } from "react";
import { pdf }           from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { NotePDF }       from "./pdfDocument";
import type { Note, NoteStore } from "@/features/notes/types";
import { saveExportBlob } from "./fileSave";


// ── Main export function ──────────────────────────────────────────────────────

export async function exportPdf(note: Note, noteStore?: Pick<NoteStore, "notes">): Promise<void> {
  registerFonts();

  const element: ReactElement = createElement(NotePDF as any, { note, noteStore });
  const blob     = await pdf(element).toBlob();
  const filename = sanitizeFilename(note.title || "untitled") + ".pdf";

  await saveExportBlob(filename, blob, "application/pdf");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim().slice(0, 100);
}
