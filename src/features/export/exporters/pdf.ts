// ─────────────────────────────────────────────────────────────────────────────
// PDF Exporter
// Uses the browser/OS native print engine via window.print().
// In Tauri this opens the native print dialog which has "Save as PDF".
// In PWA (Chrome/Edge) it opens the print dialog with PDF destination.
//
// No external dependencies needed — the OS print engine produces
// pixel-perfect output because we constrain the paper canvas to exact
// page dimensions on screen.
// ─────────────────────────────────────────────────────────────────────────────

import { PAGE_CANVAS_ID } from "@/features/notes/components/PageCanvas";
import { PAGE_SIZES, type PageSizeName } from "@/features/notes/page-sizes";

const PRINT_STYLE_ID = "noter-print-styles";

export function exportPdf(pageSize: PageSizeName, title: string): void {
  const dims = PAGE_SIZES[pageSize];

  // Remove any leftover print style
  document.getElementById(PRINT_STYLE_ID)?.remove();

  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      /* Page size and zero margin — padding is already inside the canvas */
      @page {
        size: ${dims.cssSize} portrait;
        margin: 0;
      }

      /* Hide everything in the app */
      body > * {
        display: none !important;
      }

      /* Show only our print target */
      #${PRINT_STYLE_ID}-target {
        display: block !important;
        position: fixed;
        inset: 0;
      }

      /* Paper resets for print */
      #${PAGE_CANVAS_ID} {
        box-shadow: none !important;
        margin: 0 !important;
        width: 100% !important;
        min-height: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Build a print-only wrapper
  const target = document.createElement("div");
  target.id = `${PRINT_STYLE_ID}-target`;
  target.style.display = "none";

  const canvas = document.getElementById(PAGE_CANVAS_ID);
  if (!canvas) {
    console.error("[ExportPDF] Page canvas element not found.");
    style.remove();
    return;
  }

  // Clone the canvas so we don't mutate the live DOM
  const clone = canvas.cloneNode(true) as HTMLElement;
  clone.style.boxShadow = "none";
  clone.style.margin = "0";
  target.appendChild(clone);
  document.body.appendChild(target);

  // Set document title so the PDF filename defaults to the note title
  const prevTitle = document.title;
  document.title = title;

  window.print();

  // Clean up after the print dialog closes
  const cleanup = () => {
    document.title = prevTitle;
    style.remove();
    target.remove();
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  // Fallback cleanup if afterprint doesn't fire (some browsers)
  setTimeout(cleanup, 5000);
}
