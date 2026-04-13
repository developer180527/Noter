import type { PageSizeName } from "./page-sizes";

// ── TipTap JSON ───────────────────────────────────────────────────────────────

export type TipTapNode = {
  type:     string;
  attrs?:   Record<string, unknown>;
  content?: TipTapNode[];
  marks?:   Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?:    string;
};

export type TipTapDoc = {
  type:    "doc";
  content: TipTapNode[];
};

// ── Note ──────────────────────────────────────────────────────────────────────

export interface Note {
  id:        string;
  title:     string;
  body:      string;       // legacy plain text — kept for export fallback
  content?:  TipTapDoc;   // single TipTap document (all pages flow naturally)
  tags:      string[];
  createdAt: number;
  updatedAt: number;
  pinned:    boolean;
  archived:  boolean;
  color?:    NoteColor;
  pageSize?: PageSizeName;
}

export type NoteColor = "none" | "amber" | "red" | "green" | "blue";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function emptyDoc(): TipTapDoc {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/** Convert legacy plain text to TipTap doc */
export function bodyToTipTap(body: string): TipTapDoc {
  const lines = body.replace(/\f/g, "\n---\n").split("\n");
  return {
    type: "doc",
    content: lines.map((line) =>
      line.trim()
        ? { type: "paragraph", content: [{ type: "text", text: line }] }
        : { type: "paragraph" }
    ),
  };
}

/** Get the TipTap doc from a note, migrating from body if needed */
export function getNoteContent(note: Note): TipTapDoc {
  if (note.content && note.content.content?.length > 0) return note.content;
  return bodyToTipTap(note.body);
}

// ── Filter / Store types ──────────────────────────────────────────────────────

export interface NoteFilter {
  search:   string;
  tag:      string | null;
  archived: boolean;
}

export interface NoteState {
  notes:        Note[];
  activeNoteId: string | null;
  splitNoteId:  string | null;   // second note shown side-by-side
  filter:       NoteFilter;
}

export interface NoteActions {
  createNote(partial?: Partial<Omit<Note, "id" | "createdAt" | "updatedAt">>): string;
  updateNote(id: string, patch: Partial<Omit<Note, "id" | "createdAt">>): void;
  deleteNote(id: string): void;
  setActiveNote(id: string | null): void;
  setSplitNote(id: string | null): void;
  pinNote(id: string, pinned: boolean): void;
  archiveNote(id: string, archived: boolean): void;
  setFilter(patch: Partial<NoteFilter>): void;
  filteredNotes(): Note[];
  allTags(): string[];
}

export type NoteStore = NoteState & NoteActions;