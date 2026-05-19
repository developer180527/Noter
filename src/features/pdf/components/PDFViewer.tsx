// src/features/pdf/components/PDFViewer.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Maximize2, AlignJustify, Download, Search,
  X, LayoutList,
} from "lucide-react";
import { clsx }                          from "clsx";
import { initialisePDFWorker, pdfjsLib } from "../pdfWorker";
import { PDFPage }                       from "./PDFPage";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

initialisePDFWorker();

// ── Constants ─────────────────────────────────────────────────────────────────

const ZOOM_STEP    = 0.25;
const ZOOM_MIN     = 0.25;
const ZOOM_MAX     = 4.0;
const ZOOM_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];

// ── Toolbar button ────────────────────────────────────────────────────────────

function TBtn({
  onClick, title, active, disabled, children,
}: {
  onClick:   () => void;
  title:     string;
  active?:   boolean;
  disabled?: boolean;
  children:  React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={clsx(
        "flex items-center justify-center w-8 h-8 rounded transition-colors",
        active   ? "bg-amber/15 text-amber" : "text-subtle hover:text-ink hover:bg-raised",
        disabled && "opacity-30 cursor-not-allowed pointer-events-none"
      )}
    >
      {children}
    </button>
  );
}

// ── Thumbnail sidebar ─────────────────────────────────────────────────────────

function ThumbnailSidebar({
  pdfDoc, currentPage, onPageClick,
}: {
  pdfDoc:      PDFDocumentProxy;
  currentPage: number;
  onPageClick: (n: number) => void;
}) {
  const [thumbs, setThumbs] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Render thumbnails one by one in background
    (async () => {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (cancelled) break;
        try {
          const page     = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.2 });
          const canvas   = document.createElement("canvas");
          canvas.width   = viewport.width;
          canvas.height  = viewport.height;
          const ctx      = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, canvas, viewport }).promise;
          if (!cancelled) setThumbs((prev) => {
            const next = [...prev];
            next[i - 1] = canvas.toDataURL("image/jpeg", 0.6);
            return next;
          });
        } catch { /* skip */ }
      }
    })();
    return () => { cancelled = true; };
  }, [pdfDoc]);

  return (
    <div className="flex flex-col gap-2 p-2 overflow-y-auto w-28 shrink-0 border-r border-border bg-surface">
      {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onPageClick(n)}
          className={clsx(
            "flex flex-col items-center gap-1 p-1 rounded border transition-colors",
            currentPage === n ? "border-amber/60 bg-amber/5" : "border-transparent hover:border-border"
          )}
        >
          {thumbs[n - 1] ? (
            <img src={thumbs[n - 1]} alt={`Page ${n}`} className="w-full rounded-sm shadow-md" />
          ) : (
            <div className="w-full aspect-[3/4] bg-raised rounded-sm animate-pulse" />
          )}
          <span className="text-2xs font-mono text-subtle">{n}</span>
        </button>
      ))}
    </div>
  );
}

// ── PDFViewer ─────────────────────────────────────────────────────────────────

interface PDFViewerProps {
  filePath: string;
  fileName: string;
}

export function PDFViewer({ filePath, fileName }: PDFViewerProps) {
  const [pdfDoc,      setPdfDoc]      = useState<PDFDocumentProxy | null>(null);
  const [pages,       setPages]       = useState<PDFPageProxy[]>([]);
  const [zoom,        setZoom]        = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [fitMode,     setFitMode]     = useState<"width" | "page" | "none">("width");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search,      setSearch]      = useState("");
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Load PDF ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setPdfDoc(null);
    setPages([]);
    setCurrentPage(1);
    setLoading(true);
    setError(null);

    (async () => {
      try {
        let data: Uint8Array;

        if (filePath.startsWith("data:")) {
          const b64 = filePath.split(",")[1];
          const bin = atob(b64);
          data      = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
        } else {
          const { readFile } = await import("@tauri-apps/plugin-fs");
          data = await readFile(filePath);
        }

        if (cancelled) return;

        const doc = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) { doc.destroy(); return; }

        // Load ALL page proxies in parallel — fast, metadata only
        // Actual canvas rendering is lazy (IntersectionObserver in PDFPage)
        const pageProxies = await Promise.all(
          Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1))
        );

        if (cancelled) { doc.destroy(); return; }

        setPdfDoc(doc);
        setPages(pageProxies);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load PDF");
          setLoading(false);
          console.error("PDFViewer load error:", e);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [filePath]);

  // ── Fit to width on load ──────────────────────────────────────────────────
  useEffect(() => {
    if (!pages[0] || !scrollRef.current) return;
    const w  = scrollRef.current.clientWidth - 64;
    const vp = pages[0].getViewport({ scale: 1.0 });
    setZoom(Math.min(+(w / vp.width).toFixed(3), 2.0));
  }, [pages]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const zoomIn  = () => setZoom((z) => Math.min(+(z + ZOOM_STEP).toFixed(2), ZOOM_MAX));
  const zoomOut = () => setZoom((z) => Math.max(+(z - ZOOM_STEP).toFixed(2), ZOOM_MIN));

  const fitToWidth = useCallback(() => {
    if (!pages[0] || !scrollRef.current) return;
    const w  = scrollRef.current.clientWidth - 64;
    const vp = pages[0].getViewport({ scale: 1.0 });
    setZoom(Math.min(+(w / vp.width).toFixed(3), ZOOM_MAX));
    setFitMode("width");
  }, [pages]);

  const fitToPage = useCallback(() => {
    if (!pages[0] || !scrollRef.current) return;
    const w  = scrollRef.current.clientWidth  - 64;
    const h  = scrollRef.current.clientHeight - 64;
    const vp = pages[0].getViewport({ scale: 1.0 });
    setZoom(Math.min(+(Math.min(w / vp.width, h / vp.height)).toFixed(3), ZOOM_MAX));
    setFitMode("page");
  }, [pages]);

  // ── Page navigation ───────────────────────────────────────────────────────
  const goToPage = useCallback((n: number) => {
    const clamped = Math.max(1, Math.min(n, pages.length));
    setCurrentPage(clamped);
    document.getElementById(`pdf-page-${clamped}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pages.length]);

  // ── Scroll spy ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const mid = el.getBoundingClientRect().top + el.clientHeight / 2;
      for (let i = 1; i <= pages.length; i++) {
        const pageEl = document.getElementById(`pdf-page-${i}`);
        if (!pageEl) continue;
        const rect = pageEl.getBoundingClientRect();
        if (rect.bottom >= mid) { setCurrentPage(i); break; }
      }
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [pages.length]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.key === "+" || e.key === "=") && !e.metaKey) { e.preventDefault(); zoomIn(); }
      if (e.key === "-" && !e.metaKey) { e.preventDefault(); zoomOut(); }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goToPage(currentPage + 1);
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goToPage(currentPage - 1);
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, pages.length, goToPage]);

  // ── Download ──────────────────────────────────────────────────────────────
  const download = async () => {
    try {
      const { save }      = await import("@tauri-apps/plugin-dialog");
      const { readFile }  = await import("@tauri-apps/plugin-fs");
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      const savePath = await save({ defaultPath: fileName, filters: [{ name: "PDF", extensions: ["pdf"] }] });
      if (!savePath) return;
      const data = await readFile(filePath);
      await writeFile(savePath, data);
    } catch (e) { console.error("Download failed:", e); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden bg-base">

      {/* ── Toolbar ── */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 shrink-0 border-b border-border"
        style={{ background: "rgba(10,10,10,0.95)" }}
      >
        <TBtn onClick={() => setSidebarOpen((v) => !v)} title="Thumbnails" active={sidebarOpen}>
          <LayoutList size={14} />
        </TBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <TBtn onClick={() => goToPage(currentPage - 1)} title="Previous page (←)" disabled={currentPage <= 1}>
          <ChevronLeft size={14} />
        </TBtn>

        <div className="flex items-center gap-1">
          <input
            type="number" value={currentPage} min={1} max={pages.length || 1}
            onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
            className="w-10 text-center text-xs font-mono bg-raised border border-border
                       rounded px-1 py-0.5 outline-none focus:border-amber/50 text-ink"
          />
          <span className="text-2xs font-mono text-subtle">/ {pages.length || "—"}</span>
        </div>

        <TBtn onClick={() => goToPage(currentPage + 1)} title="Next page (→)" disabled={currentPage >= pages.length}>
          <ChevronRight size={14} />
        </TBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <TBtn onClick={zoomOut} title="Zoom out (−)" disabled={zoom <= ZOOM_MIN}>
          <ZoomOut size={14} />
        </TBtn>

        <select
          value={ZOOM_PRESETS.find((p) => Math.abs(p - zoom) < 0.01) ?? "custom"}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) { setZoom(v); setFitMode("none"); }
          }}
          className="text-xs font-mono bg-raised border border-border rounded
                     px-1 py-0.5 outline-none text-ink cursor-pointer"
          style={{ width: 72 }}
        >
          {ZOOM_PRESETS.map((p) => (
            <option key={p} value={p}>{Math.round(p * 100)}%</option>
          ))}
          {!ZOOM_PRESETS.find((p) => Math.abs(p - zoom) < 0.01) && (
            <option value="custom">{Math.round(zoom * 100)}%</option>
          )}
        </select>

        <TBtn onClick={zoomIn} title="Zoom in (+)" disabled={zoom >= ZOOM_MAX}>
          <ZoomIn size={14} />
        </TBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <TBtn onClick={fitToWidth} title="Fit to width" active={fitMode === "width"}>
          <AlignJustify size={13} />
        </TBtn>
        <TBtn onClick={fitToPage} title="Fit to page" active={fitMode === "page"}>
          <Maximize2 size={13} />
        </TBtn>

        <div className="flex-1" />
        <span className="text-2xs font-mono text-subtle/60 truncate max-w-48 hidden sm:block">{fileName}</span>
        <div className="w-px h-5 bg-border mx-1" />

        <TBtn
          onClick={() => { setSearchOpen((v) => !v); setTimeout(() => searchRef.current?.focus(), 50); }}
          title="Search (⌘F)" active={searchOpen}
        >
          <Search size={13} />
        </TBtn>

        <TBtn onClick={download} title="Download PDF">
          <Download size={13} />
        </TBtn>
      </div>

      {/* ── Search bar ── */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface shrink-0">
          <Search size={12} className="text-subtle shrink-0" />
          <input
            ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in PDF…"
            className="flex-1 bg-transparent text-xs font-sans text-ink outline-none placeholder:text-subtle/40"
          />
          <span className="text-2xs font-mono text-subtle/40">Coming soon</span>
          <button onClick={() => { setSearchOpen(false); setSearch(""); }}>
            <X size={12} className="text-subtle hover:text-ink transition-colors" />
          </button>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {sidebarOpen && pdfDoc && (
          <ThumbnailSidebar pdfDoc={pdfDoc} currentPage={currentPage} onPageClick={goToPage} />
        )}

        <div ref={scrollRef} className="flex-1 overflow-auto" style={{ background: "#525659" }}>

          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="flex gap-1 justify-center">
                  {[0,1,2].map((i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-amber/40 animate-pulse"
                      style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
                <p className="text-xs font-mono text-white/50">Loading {fileName}…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2 px-8">
                <p className="text-sm font-sans text-white/70">Could not load PDF</p>
                <p className="text-xs font-mono text-white/40">{error}</p>
                <p className="text-2xs font-mono text-white/30">
                  Check: public/pdf.worker.mjs exists, fs permissions in capabilities
                </p>
              </div>
            </div>
          )}

          {!loading && !error && pages.length > 0 && (
            <div className="flex flex-col items-center py-8 px-8">
              {pages.map((page, i) => (
                <PDFPage
                  key={i}
                  page={page}
                  zoom={zoom}
                  pageNum={i + 1}
                />
              ))}
              {/* Bottom padding so last page number label is visible */}
              <div style={{ height: 32 }} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}