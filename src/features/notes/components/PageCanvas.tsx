// ─────────────────────────────────────────────────────────────────────────────
// PageCanvas
// Renders a fixed-width, paper-proportioned white canvas centered on a gray
// "desk". Children render inside the printable content area.
//
// Page break lines are drawn at every pageContentHeight interval so the user
// knows exactly where one page ends and the next begins.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect, useState, type ReactNode } from "react";
import { PAGE_SIZES, PAGE_SIZE_NAMES, type PageSizeName } from "../page-sizes";

// ── Page break lines ──────────────────────────────────────────────────────────

function PageBreaks({
  pageHeight,
  contentHeight,
  marginTop,
  marginBottom,
}: {
  pageHeight:    number;
  contentHeight: number;
  marginTop:     number;
  marginBottom:  number;
}) {
  // Content area per page (excluding margins that repeat each page)
  const contentPerPage = pageHeight - marginTop - marginBottom;
  const breaks: number[] = [];

  for (let y = contentPerPage; y < contentHeight; y += contentPerPage) {
    breaks.push(y);
  }

  if (breaks.length === 0) return null;

  return (
    <>
      {breaks.map((y, i) => (
        <div
          key={y}
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: y }}
        >
          {/* Dashed page break line */}
          <div className="border-t-2 border-dashed border-[#e0dbd2]" />
          {/* Page number label */}
          <div className="absolute right-0 top-1 text-[10px] font-mono text-[#b0a898] select-none pr-1">
            p. {i + 2}
          </div>
        </div>
      ))}
    </>
  );
}

// ── Page size selector ────────────────────────────────────────────────────────

export function PageSizeSelector({
  value,
  onChange,
}: {
  value:    PageSizeName;
  onChange: (size: PageSizeName) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PageSizeName)}
      className="text-2xs font-mono bg-overlay border border-border rounded px-1.5 py-0.5
                 text-muted hover:text-ink focus:outline-none focus:border-amber/50
                 cursor-pointer transition-colors appearance-none"
    >
      {PAGE_SIZE_NAMES.map((name) => (
        <option key={name} value={name}>
          {PAGE_SIZES[name].label}
        </option>
      ))}
    </select>
  );
}

// ── PageCanvas ────────────────────────────────────────────────────────────────

export const PAGE_CANVAS_ID = "noter-page-canvas";

interface PageCanvasProps {
  size:     PageSizeName;
  children: ReactNode;
}

export function PageCanvas({ size, children }: PageCanvasProps) {
  const dims = PAGE_SIZES[size];
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(dims.height);

  // Track paper height via ResizeObserver so page break lines update live
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      setContentHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    // ── Desk (gray area behind paper) ─────────────────────────────────────────
    <div className="flex-1 overflow-y-auto bg-[#2c2c2c] px-8 py-10 noter-desk">
      {/* ── Paper ──────────────────────────────────────────────────────────── */}
      <div
        id={PAGE_CANVAS_ID}
        className="relative mx-auto shadow-[0_4px_32px_rgba(0,0,0,0.4)] mb-10"
        style={{
          width:         dims.width,
          minHeight:     dims.height,
          paddingTop:    dims.marginTop,
          paddingBottom: dims.marginBottom,
          paddingLeft:   dims.marginLeft,
          paddingRight:  dims.marginRight,
          backgroundColor: "#f7f4ef",
        }}
        data-page-size={size}
      >
        {/* Content area */}
        <div ref={contentRef} className="relative">
          {children}

          {/* Page break indicators */}
          <PageBreaks
            pageHeight={dims.height}
            contentHeight={contentHeight}
            marginTop={dims.marginTop}
            marginBottom={dims.marginBottom}
          />
        </div>
      </div>
    </div>
  );
}
