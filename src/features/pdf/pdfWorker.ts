// src/features/pdf/pdfWorker.ts
//
// SETUP REQUIRED: Copy the worker file to public/ once:
//   cp node_modules/pdfjs-dist/build/pdf.worker.mjs public/pdf.worker.mjs
//
// This is the most reliable approach across Vite versions and Tauri's WebView.
// ?url imports and new URL() can break with Vite 8 / Rolldown.
// A static file in public/ always resolves correctly.

import * as pdfjsLib from "pdfjs-dist";

let initialised = false;

export function initialisePDFWorker(): void {
  if (initialised) return;
  initialised = true;

  // Tauri serves public/ files at the app's origin.
  // This path is always correct in both dev and production builds.
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
}

export { pdfjsLib };