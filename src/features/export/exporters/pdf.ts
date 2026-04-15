// ─────────────────────────────────────────────────────────────────────────────
// PDF Exporter
// Clones the active note's content area into a print-only container,
// injects print CSS, and calls window.print().
// Works with the flowing (no-pagination) editor.
// ─────────────────────────────────────────────────────────────────────────────

const PRINT_ID = "noter-print-container";

export function exportPdf(_pageSize: string, title: string): void {
  // Clean up any previous print container
  document.getElementById(PRINT_ID)?.remove();
  document.getElementById(`${PRINT_ID}-style`)?.remove();

  // Find the scrollable content area of the note editor
  // NoteEditor renders: div.flex-1.overflow-y-auto > div.max-w-2xl > [title, date, tags, editor]
  const contentArea = document.querySelector(".prose-noter")?.closest(".overflow-y-auto");
  if (!contentArea) {
    console.error("[ExportPDF] Could not find note content area.");
    // Fallback — just print the whole page
    window.print();
    return;
  }

  // Clone the content
  const clone = contentArea.cloneNode(true) as HTMLElement;

  // Wrap in a print container
  const container = document.createElement("div");
  container.id = PRINT_ID;
  container.appendChild(clone);
  document.body.appendChild(container);

  // Inject print styles
  const style = document.createElement("style");
  style.id = `${PRINT_ID}-style`;
  style.textContent = `
    @media print {
      @page {
        size: A4 portrait;
        margin: 20mm 18mm;
      }

      /* Hide everything except our print container */
      body > *:not(#${PRINT_ID}) {
        display: none !important;
        visibility: hidden !important;
      }

      #${PRINT_ID} {
        display: block !important;
        position: fixed !important;
        inset: 0 !important;
        overflow: visible !important;
        background: white !important;
        color: black !important;
        padding: 0 !important;
        margin: 0 !important;
        z-index: 99999 !important;
      }

      /* Override dark theme colors for print */
      #${PRINT_ID} * {
        color: black !important;
        background: transparent !important;
        border-color: #ccc !important;
      }

      #${PRINT_ID} .prose-noter {
        font-family: 'Georgia', serif !important;
        font-size: 11pt !important;
        line-height: 1.7 !important;
        color: black !important;
      }

      #${PRINT_ID} h1, #${PRINT_ID} h2, #${PRINT_ID} h3 {
        color: black !important;
        page-break-after: avoid;
      }

      #${PRINT_ID} pre, #${PRINT_ID} code {
        background: #f5f5f5 !important;
        color: #333 !important;
        border: 1px solid #ddd !important;
        font-size: 9pt !important;
      }

      #${PRINT_ID} blockquote {
        border-left: 3px solid #999 !important;
        color: #555 !important;
      }

      #${PRINT_ID} a {
        color: #1a0dab !important;
        text-decoration: underline !important;
      }

      #${PRINT_ID} img {
        max-width: 100% !important;
        page-break-inside: avoid;
      }

      /* Hide scrollbar and overflow controls */
      #${PRINT_ID} [class*="overflow"] {
        overflow: visible !important;
      }
    }
  `;
  document.head.appendChild(style);

  const prevTitle = document.title;
  document.title  = title;

  window.print();

  const cleanup = () => {
    document.title = prevTitle;
    document.getElementById(PRINT_ID)?.remove();
    document.getElementById(`${PRINT_ID}-style`)?.remove();
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  // Fallback cleanup in case afterprint doesn't fire (some browsers/Tauri)
  setTimeout(cleanup, 10_000);
}