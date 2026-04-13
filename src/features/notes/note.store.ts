import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { Note, NoteFilter, NoteStore } from "./types";
import { SYNC_EVENTS } from "./events";

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function filterNotes(notes: Note[], filter: NoteFilter): Note[] {
  const seen = new Set<string>();
  const unique = notes.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  return unique
    .filter((n) => n.archived === filter.archived)
    .filter((n) => !filter.tag || n.tags.includes(filter.tag))
    .filter((n) => {
      if (!filter.search) return true;
      const q = filter.search.toLowerCase();
      const textContent = n.content ? extractText(n.content) : n.body;
      return n.title.toLowerCase().includes(q) ||
             textContent.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
}

export function extractText(node: { type?: string; text?: string; content?: unknown[] }): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return (node.content as typeof node[]).map(extractText).join(" ");
}

export function extractTags(notes: Note[]): string[] {
  const tags = new Set<string>();
  notes.forEach((n) => n.tags.forEach((t) => tags.add(t)));
  return [...tags].sort();
}

// ── Event emitter injection ───────────────────────────────────────────────────
// The store never calls Kernel.getInstance() directly.
// The notes feature injects an emitter in onStart via _initStoreEmitter().
// This keeps the store decoupled from the kernel singleton.

type StoreEmitter = (event: string, payload: Record<string, unknown>) => void;
let _storeEmitter: StoreEmitter | null = null;

export function _initStoreEmitter(emitter: StoreEmitter) {
  _storeEmitter = emitter;
}

function emit(event: string, payload: Record<string, unknown>) {
  _storeEmitter?.(event, payload);
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useNoteStore = create<NoteStore>()(
  persist(
    immer((set) => ({
      notes:        [] as Note[],
      activeNoteId: null as string | null,
      splitNoteId:  null as string | null,
      filter: {
        search:   "",
        tag:      null,
        archived: false,
      } as NoteFilter,

      createNote(partial: Partial<Omit<Note, "id" | "createdAt" | "updatedAt">> = {}): string {
        const id  = nanoid(10);
        const now = Date.now();
        const note: Note = {
          id,
          title:     partial.title    ?? "Untitled",
          body:      partial.body     ?? "",
          content:   partial.content  ?? undefined,
          tags:      partial.tags     ?? [],
          pinned:    partial.pinned   ?? false,
          archived:  partial.archived ?? false,
          color:     partial.color    ?? "none",
          pageSize:  partial.pageSize,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => { s.notes.unshift(note); s.activeNoteId = id; });
        emit(SYNC_EVENTS.NOTE_FLUSHED, { id, note });
        return id;
      },

      updateNote(id: string, patch: Partial<Omit<Note, "id" | "createdAt">>) {
        set((s) => {
          const note = s.notes.find((n: Note) => n.id === id);
          if (note) { Object.assign(note, patch); note.updatedAt = Date.now(); }
        });
      },

      deleteNote(id: string) {
        set((s) => {
          const idx = s.notes.findIndex((n: Note) => n.id === id);
          if (idx !== -1) s.notes.splice(idx, 1);
          if (s.activeNoteId === id) {
            s.activeNoteId = (s.notes[0] as Note | undefined)?.id ?? null;
          }
          if (s.splitNoteId === id) s.splitNoteId = null;
        });
        emit(SYNC_EVENTS.NOTE_DELETED, { id });
      },

      setActiveNote(id: string | null) {
        set((s) => { s.activeNoteId = id; });
      },

      setSplitNote(id: string | null) {
        set((s) => { s.splitNoteId = id; });
      },

      pinNote(id: string, pinned: boolean) {
        let note: Note | undefined;
        set((s) => {
          note = s.notes.find((n: Note) => n.id === id);
          if (note) { note.pinned = pinned; note.updatedAt = Date.now(); }
        });
        if (note) emit(SYNC_EVENTS.NOTE_PINNED, { id, note });
      },

      archiveNote(id: string, archived: boolean) {
        let note: Note | undefined;
        set((s) => {
          note = s.notes.find((n: Note) => n.id === id);
          if (note) { note.archived = archived; note.updatedAt = Date.now(); }
          if (s.activeNoteId === id && archived) {
            s.activeNoteId = s.notes.find((n: Note) => !n.archived && n.id !== id)?.id ?? null;
          }
        });
        if (note) emit(SYNC_EVENTS.NOTE_ARCHIVED, { id, note });
      },

      setFilter(patch: Partial<NoteFilter>) {
        set((s) => { Object.assign(s.filter, patch); });
      },

      filteredNotes(): Note[] {
        const st = useNoteStore.getState();
        return filterNotes(st.notes, st.filter);
      },

      allTags(): string[] {
        return extractTags(useNoteStore.getState().notes);
      },
    })),
    {
      name: "noter:notes-v2",
      partialize: (s) => ({ notes: s.notes }),
      merge: (persisted: unknown, current) => {
        const p = persisted as { notes?: Note[] };
        if (!p?.notes) return current;
        const seen = new Set<string>();
        const notes = p.notes.filter((n) => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
        return { ...current, notes };
      },
    }
  )
);