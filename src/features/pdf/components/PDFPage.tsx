// src/features/pdf/components/PDFPage.tsx
// Lazy rendering — uses IntersectionObserver to only render when visible.
// Pages outside the viewport are placeholder boxes with the correct size.
// This makes large PDFs (40+ pages) scroll smoothly without lag.

import { useEffect, useRef, useState } from "react";
import type { PDFPageProxy } from "pdfjs-dist";

interface PDFPageProps {
  page:    PDFPageProxy;
  zoom:    number;
  pageNum: number;
}

export function PDFPage({ page, zoom, pageNum }: PDFPageProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [visible,   setVisible]   = useState(false);
  const [rendered,  setRendered]  = useState(false);
  const [rendering, setRendering] = useState(false);

  // Compute CSS dimensions at current zoom (for placeholder sizing)
  const cssViewport = page.getViewport({ scale: zoom });
  const cssWidth    = Math.floor(cssViewport.width);
  const cssHeight   = Math.floor(cssViewport.height);

  // ── IntersectionObserver — trigger render when page enters viewport ──────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect(); // once visible, render permanently
        }
      },
      { rootMargin: "300px" } // start rendering 300px before entering viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Render to canvas when visible or zoom changes ────────────────────────
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cancel any in-progress render
    renderTaskRef.current?.cancel();
    setRendering(true);
    setRendered(false);

    const dpr      = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: zoom * dpr });

    canvas.width       = viewport.width;
    canvas.height      = viewport.height;
    canvas.style.width  = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderTask = page.render({
      canvasContext: ctx,
      canvas,
      viewport,
    });

    renderTaskRef.current = renderTask;

    renderTask.promise
      .then(() => { setRendering(false); setRendered(true); })
      .catch((err: any) => {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`PDF page ${pageNum} render error:`, err);
        }
        setRendering(false);
      });

    return () => { renderTaskRef.current?.cancel(); };
  }, [visible, zoom]); // eslint-disable-line

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNum}`}
      style={{
        width:        cssWidth,
        height:       cssHeight,
        marginBottom: 16,
        position:     "relative",
        flexShrink:   0,
      }}
    >
      {/* Paper shadow */}
      <div
        style={{
          width:        cssWidth,
          height:       cssHeight,
          position:     "absolute",
          boxShadow:    "0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.25)",
          borderRadius: 2,
          overflow:     "hidden",
          background:   "#fff",
        }}
      >
        {/* Placeholder while not yet visible or rendering */}
        {(!visible || rendering) && (
          <div
            style={{
              position:   "absolute",
              inset:      0,
              background: "#f0f0f0",
              display:    "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {visible && rendering && (
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width:           8,
                      height:          8,
                      borderRadius:    "50%",
                      background:      "rgba(0,0,0,0.2)",
                      animation:       "pulse 1.2s ease-in-out infinite",
                      animationDelay:  `${i * 150}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Canvas — always mounted when visible, hidden while rendering */}
        {visible && (
          <canvas
            ref={canvasRef}
            style={{
              display:  "block",
              opacity:  rendered ? 1 : 0,
              transition:"opacity 150ms ease",
            }}
          />
        )}
      </div>

      {/* Page number label below the page */}
      <div
        style={{
          position:   "absolute",
          bottom:     -20,
          right:      0,
          fontSize:   10,
          fontFamily: "monospace",
          color:      "rgba(255,255,255,0.4)",
          userSelect: "none",
        }}
      >
        {pageNum}
      </div>
    </div>
  );
}