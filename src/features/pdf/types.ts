// src/features/pdf/types.ts

export interface PDFFile {
  id:        string;
  name:      string;       // display name (filename without extension)
  filename:  string;       // full filename with extension
  path:      string;       // absolute path on disk
  size:      number;       // bytes
  pageCount: number;       // total pages (0 until loaded)
  addedAt:   number;       // timestamp ms
  thumbnail?: string;      // base64 data URL of page 1 thumbnail
}

export interface PDFViewerState {
  currentPage:  number;
  totalPages:   number;
  zoom:         number;    // 1.0 = 100%
  fitMode:      "width" | "page" | "none";
  searchQuery:  string;
  sidebarOpen:  boolean;
}