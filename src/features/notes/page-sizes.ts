// ─────────────────────────────────────────────────────────────────────────────
// Page Sizes
// Pixel values at 96dpi (standard screen resolution).
// CSS @page size strings match browser/OS print engine names.
// ─────────────────────────────────────────────────────────────────────────────

export type PageSizeName = "a4" | "letter" | "legal" | "a5" | "a3";

export interface PageDimensions {
  label:         string;
  width:         number;   // px
  height:        number;   // px
  marginTop:     number;   // px
  marginBottom:  number;   // px
  marginLeft:    number;   // px
  marginRight:   number;   // px
  cssSize:       string;   // for @page { size: ... }
}

export const PAGE_SIZES: Record<PageSizeName, PageDimensions> = {
  a4: {
    label:        "A4",
    width:        794,   // 210mm @ 96dpi
    height:       1123,  // 297mm @ 96dpi
    marginTop:    96,
    marginBottom: 96,
    marginLeft:   96,
    marginRight:  96,
    cssSize:      "A4",
  },
  letter: {
    label:        "Letter",
    width:        816,   // 8.5in @ 96dpi
    height:       1056,  // 11in  @ 96dpi
    marginTop:    96,
    marginBottom: 96,
    marginLeft:   96,
    marginRight:  96,
    cssSize:      "letter",
  },
  legal: {
    label:        "Legal",
    width:        816,   // 8.5in @ 96dpi
    height:       1344,  // 14in  @ 96dpi
    marginTop:    96,
    marginBottom: 96,
    marginLeft:   96,
    marginRight:  96,
    cssSize:      "legal",
  },
  a5: {
    label:        "A5",
    width:        559,   // 148mm @ 96dpi
    height:       794,   // 210mm @ 96dpi
    marginTop:    72,
    marginBottom: 72,
    marginLeft:   72,
    marginRight:  72,
    cssSize:      "A5",
  },
  a3: {
    label:        "A3",
    width:        1123,  // 297mm @ 96dpi
    height:       1587,  // 420mm @ 96dpi
    marginTop:    120,
    marginBottom: 120,
    marginLeft:   120,
    marginRight:  120,
    cssSize:      "A3",
  },
};

export const PAGE_SIZE_NAMES = Object.keys(PAGE_SIZES) as PageSizeName[];

/** Content area dimensions (page minus margins) */
export function contentDimensions(size: PageSizeName) {
  const d = PAGE_SIZES[size];
  return {
    width:  d.width  - d.marginLeft - d.marginRight,
    height: d.height - d.marginTop  - d.marginBottom,
  };
}
