import { PAGE_SIZES, type PageSizeName } from "@/features/notes/page-sizes";

const PRINT_STYLE_ID = "noter-print-styles";

export function exportPdf(pageSize: PageSizeName, title: string): void {
  const dims = PAGE_SIZES[pageSize];

  document.getElementById(PRINT_STYLE_ID)?.remove();

  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      @page {
        size: ${dims.cssSize} portrait;
        margin: 0;
      }
      body > * { display: none !important; }
      #${PRINT_STYLE_ID}-target {
        display: flex !important;
        flex-direction: column;
        align-items: center;
        gap: 0;
        position: fixed;
        inset: 0;
        overflow: auto;
      }
      #${PRINT_STYLE_ID}-target [data-page-index] {
        box-shadow: none !important;
        page-break-after: always;
      }
    }
  `;
  document.head.appendChild(style);

  const pageEls = document.querySelectorAll("[data-page-index]");
  if (pageEls.length === 0) {
    console.error("[ExportPDF] No page elements found.");
    style.remove();
    return;
  }

  const target = document.createElement("div");
  target.id = `${PRINT_STYLE_ID}-target`;
  target.style.display = "none";

  pageEls.forEach((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.boxShadow = "none";
    clone.style.margin    = "0";
    target.appendChild(clone);
  });

  document.body.appendChild(target);

  const prevTitle = document.title;
  document.title  = title;

  window.print();

  const cleanup = () => {
    document.title = prevTitle;
    style.remove();
    target.remove();
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(cleanup, 5000);
}