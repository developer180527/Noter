import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import { Kernel } from "@/core";
import { SYNC_EVENTS } from "@/bridge/tauri-sync";
import type { Note, NoteFilter, NoteStore } from "./types";

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function filterNotes(notes: Note[], filter: NoteFilter): Note[] {
  // Deduplicate by ID first — guards against corrupted persisted state
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
             textContent.toLowerCase().includes(q) ||
             n.body.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
}

/** Recursively extract plain text from a TipTap doc for search. */
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

function emit(event: string, payload: { id: string }) {
  Kernel.getInstance().events.emit(event, payload);
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useNoteStore = create<NoteStore>()(
  persist(
    immer((set) => ({
      notes:        [] as Note[],
      activeNoteId: null as string | null,
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
          title:    partial.title    ?? "Untitled",
          body:     partial.body     ?? "",
          content:  partial.content  ?? undefined,
          tags:     partial.tags     ?? [],
          pinned:   partial.pinned   ?? false,
          archived: partial.archived ?? false,
          color:    partial.color    ?? "none",
          pageSize: partial.pageSize,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => {
          s.notes.unshift(note);
          s.activeNoteId = id;
        });
        emit(SYNC_EVENTS.NOTE_FLUSHED, { id });
        return id;
      },

      updateNote(id: string, patch: Partial<Omit<Note, "id" | "createdAt">>) {
        set((s) => {
          const note = s.notes.find((n: Note) => n.id === id);
          if (note) {
            Object.assign(note, patch);
            note.updatedAt = Date.now();
          }
        });
      },

      deleteNote(id: string) {
        set((s) => {
          const idx = s.notes.findIndex((n: Note) => n.id === id);
          if (idx !== -1) s.notes.splice(idx, 1);
          if (s.activeNoteId === id) {
            s.activeNoteId = (s.notes[0] as Note | undefined)?.id ?? null;
          }
        });
        emit(SYNC_EVENTS.NOTE_DELETED, { id });
      },

      setActiveNote(id: string | null) {
        set((s) => { s.activeNoteId = id; });
      },

      pinNote(id: string, pinned: boolean) {
        set((s) => {
          const n = s.notes.find((n: Note) => n.id === id);
          if (n) { n.pinned = pinned; n.updatedAt = Date.now(); }
        });
        emit(SYNC_EVENTS.NOTE_PINNED, { id });
      },

      archiveNote(id: string, archived: boolean) {
        set((s) => {
          const n = s.notes.find((n: Note) => n.id === id);
          if (n) { n.archived = archived; n.updatedAt = Date.now(); }
          if (s.activeNoteId === id && archived) {
            s.activeNoteId = s.notes.find(
              (n: Note) => !n.archived && n.id !== id
            )?.id ?? null;
          }
        });
        emit(SYNC_EVENTS.NOTE_ARCHIVED, { id });
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
        // Deduplicate on load
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