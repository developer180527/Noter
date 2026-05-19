// src/features/pdf/components/PDFGrid.tsx
// Shows all saved PDFs in a grid. Supports drag-drop and file picker to add PDFs.
// Clicking a PDF opens it in a new tab via the tab store.

import { useState, useCallback, useRef } from "react";
import { FileText, Plus, Trash2, Upload } from "lucide-react";
import { clsx } from "clsx";
import { nanoid } from "nanoid";
import { usePDFStore } from "../pdf.store";
import { useTabStore } from "@/features/tabs/tab.store";
import type { PDFFile } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── PDF Card ──────────────────────────────────────────────────────────────────

function PDFCard({ file, onOpen, onDelete }: {
  file:     PDFFile;
  onOpen:   (file: PDFFile) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative group flex flex-col rounded-xl overflow-hidden border
                 border-border hover:border-amber/40 transition-all duration-150
                 cursor-pointer bg-surface hover:bg-raised"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(file)}
    >
      {/* Thumbnail / preview */}
      <div
        className="w-full aspect-[3/4] flex items-center justify-center relative overflow-hidden"
        style={{ background: "#525659" }}
      >
        {file.thumbnail ? (
          <img
            src={file.thumbnail}
            alt={file.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-40">
            <FileText size={32} className="text-white" />
            <span className="text-2xs font-mono text-white">PDF</span>
          </div>
        )}

        {/* Page count badge */}
        {file.pageCount > 0 && (
          <div
            className="absolute bottom-2 right-2 text-2xs font-mono px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
          >
            {file.pageCount}p
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
          className={clsx(
            "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center",
            "bg-danger/80 text-white transition-opacity duration-150",
            hovered ? "opacity-100" : "opacity-0"
          )}
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-sans text-ink truncate font-medium">{file.name}</p>
        <p className="text-2xs font-mono text-subtle mt-0.5">
          {formatSize(file.size)} · {formatDate(file.addedAt)}
        </p>
      </div>
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const pdfs = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    if (pdfs.length) onFiles(pdfs);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed",
        "cursor-pointer transition-all duration-150 aspect-[3/4]",
        dragging
          ? "border-amber bg-amber/5 scale-[1.02]"
          : "border-border hover:border-muted hover:bg-raised/50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
      <Upload size={20} className={dragging ? "text-amber" : "text-subtle"} />
      <div className="text-center">
        <p className="text-xs font-sans text-muted">Drop PDFs here</p>
        <p className="text-2xs font-mono text-subtle mt-0.5">or click to browse</p>
      </div>
    </div>
  );
}

// ── PDFGrid ───────────────────────────────────────────────────────────────────

export function PDFGrid() {
  const files      = usePDFStore((s) => s.files);
  const addFile    = usePDFStore((s) => s.addFile);
  const removeFile = usePDFStore((s) => s.removeFile);
  const setThumb   = usePDFStore((s) => s.setThumbnail);
  const updateFile = usePDFStore((s) => s.updateFile);
  const openTab    = useTabStore((s) => s.openTab);

  // ── Handle new PDF files ────────────────────────────────────────────────────
  const handleFiles = useCallback(async (rawFiles: File[]) => {
    for (const raw of rawFiles) {
      const id = nanoid(8);

      // Read file as ArrayBuffer
      const buffer = await raw.arrayBuffer();
      const bytes  = new Uint8Array(buffer);

      // Save to app data dir via Tauri
      let savedPath = "";
      try {
        const { appDataDir }   = await import("@tauri-apps/api/path");
        const { mkdir, writeFile, exists } = await import("@tauri-apps/plugin-fs");

        const dataDir  = await appDataDir();
        const pdfDir   = `${dataDir}/pdfs`;
        const fileExists = await exists(pdfDir);
        if (!fileExists) await mkdir(pdfDir, { recursive: true });

        savedPath = `${pdfDir}/${id}_${raw.name}`;
        await writeFile(savedPath, bytes);
      } catch (e) {
        console.error("Failed to save PDF:", e);
        continue;
      }

      const newFile: PDFFile = {
        id,
        name:      raw.name.replace(/\.pdf$/i, ""),
        filename:  raw.name,
        path:      savedPath,
        size:      raw.size,
        pageCount: 0,
        addedAt:   Date.now(),
      };

      addFile(newFile);

      // Generate thumbnail + page count asynchronously
      generateThumbnail(bytes, id, updateFile, setThumb);
    }
  }, [addFile, updateFile, setThumb]);

  // ── Open PDF in new tab ─────────────────────────────────────────────────────
  const openPDF = useCallback((file: PDFFile) => {
    openTab({
      id:        `pdf-${file.id}`,
      title:     file.name,
      component: () => null,   // resolved via slot registry
      props:     { _componentKey: "pdf:viewer", pdfPath: file.path, pdfName: file.name },
      closeable: true,
      pinned:    false,
    });
  }, [openTab]);

  // ── Open native file picker ─────────────────────────────────────────────────
  const openPicker = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: true,
        filters:  [{ name: "PDF", extensions: ["pdf"] }],
        title:    "Add PDF files",
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];

      for (const path of paths) {
        const { readFile } = await import("@tauri-apps/plugin-fs");
        const bytes        = await readFile(path);
        const filename     = path.split(/[\\/]/).pop() ?? "document.pdf";
        const id           = nanoid(8);

        const newFile: PDFFile = {
          id,
          name:      filename.replace(/\.pdf$/i, ""),
          filename,
          path,
          size:      bytes.length,
          pageCount: 0,
          addedAt:   Date.now(),
        };

        addFile(newFile);
        generateThumbnail(bytes, id, updateFile, setThumb);
      }
    } catch (e) {
      console.error("File picker failed:", e);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-base">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-base font-serif font-semibold text-ink">PDFs</h1>
          <p className="text-2xs font-mono text-subtle mt-0.5">
            {files.length} {files.length === 1 ? "document" : "documents"}
          </p>
        </div>
        <button
          onClick={openPicker}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
                     bg-amber/15 text-amber hover:bg-amber/25 transition-colors"
        >
          <Plus size={12} />
          Add PDF
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {files.length === 0 ? (
          // Empty state — big drop zone
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-64">
              <DropZone onFiles={handleFiles} />
            </div>
            <p className="text-xs font-sans text-subtle">
              Drop PDF files here or click Add PDF to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {files.map((file) => (
              <PDFCard
                key={file.id}
                file={file}
                onOpen={openPDF}
                onDelete={removeFile}
              />
            ))}
            {/* Add more — small drop zone card */}
            <DropZone onFiles={handleFiles} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Thumbnail generation (async, non-blocking) ────────────────────────────────

async function generateThumbnail(
  bytes:      Uint8Array,
  id:         string,
  updateFile: (id: string, patch: any) => void,
  setThumb:   (id: string, thumb: string) => void,
) {
  try {
    const { initialisePDFWorker, pdfjsLib } = await import("../pdfWorker");
    initialisePDFWorker();

    const doc      = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page     = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas   = document.createElement("canvas");
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    const ctx      = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;

    setThumb(id, canvas.toDataURL("image/jpeg", 0.7));
    updateFile(id, { pageCount: doc.numPages });
    doc.destroy();
  } catch (e) {
    console.warn("Thumbnail generation failed:", e);
  }
}