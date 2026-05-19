// src/features/pdf/pdf.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PDFFile } from "./types";

interface PDFState {
  files: PDFFile[];
}

interface PDFActions {
  addFile(file: PDFFile): void;
  removeFile(id: string): void;
  updateFile(id: string, patch: Partial<PDFFile>): void;
  setThumbnail(id: string, thumbnail: string): void;
}

export const usePDFStore = create<PDFState & PDFActions>()(
  persist(
    (set) => ({
      files: [],

      addFile: (file) =>
        set((s) => ({
          files: s.files.some((f) => f.id === file.id)
            ? s.files
            : [...s.files, file],
        })),

      removeFile: (id) =>
        set((s) => ({ files: s.files.filter((f) => f.id !== id) })),

      updateFile: (id, patch) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),

      setThumbnail: (id, thumbnail) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, thumbnail } : f)),
        })),
    }),
    { name: "noter:pdf-v1" }
  )
);