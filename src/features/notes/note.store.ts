import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { Note, NoteStore } from "./types";

export const useNoteStore = create<NoteStore>()(
  persist(
    immer((set, get) => ({
      notes:         [],
      activeNoteId:  null,
      filter: {
        search:   "",
        tag:      null,
        archived: false,
      },

      createNote(partial = {}) {
        const id = nanoid(10);
        const now = Date.now();
        const note: Note = {
          id,
          title:    partial.title    ?? "Untitled",
          body:     partial.body     ?? "",
          tags:     partial.tags     ?? [],
          pinned:   partial.pinned   ?? false,
          archived: partial.archived ?? false,
          color:    partial.color    ?? "none",
          createdAt: now,
          updatedAt: now,
        };
        set((s) => {
          s.notes.unshift(note);
          s.activeNoteId = id;
        });
        return id;
      },

      updateNote(id, patch) {
        set((s) => {
          const note = s.notes.find((n) => n.id === id);
          if (note) {
            Object.assign(note, patch);
            note.updatedAt = Date.now();
          }
        });
      },

      deleteNote(id) {
        set((s) => {
          s.notes = s.notes.filter((n) => n.id !== id);
          if (s.activeNoteId === id) {
            s.activeNoteId = s.notes[0]?.id ?? null;
          }
        });
      },

      setActiveNote(id) {
        set((s) => { s.activeNoteId = id; });
      },

      pinNote(id, pinned) {
        set((s) => {
          const n = s.notes.find((n) => n.id === id);
          if (n) { n.pinned = pinned; n.updatedAt = Date.now(); }
        });
      },

      archiveNote(id, archived) {
        set((s) => {
          const n = s.notes.find((n) => n.id === id);
          if (n) { n.archived = archived; n.updatedAt = Date.now(); }
          if (s.activeNoteId === id && archived) {
            s.activeNoteId = s.notes.find((n) => !n.archived && n.id !== id)?.id ?? null;
          }
        });
      },

      setFilter(patch) {
        set((s) => { Object.assign(s.filter, patch); });
      },

      filteredNotes() {
        const { notes, filter } = get();
        return notes
          .filter((n) => n.archived === filter.archived)
          .filter((n) => !filter.tag || n.tags.includes(filter.tag))
          .filter((n) => {
            if (!filter.search) return true;
            const q = filter.search.toLowerCase();
            return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
          })
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return b.updatedAt - a.updatedAt;
          });
      },

      allTags() {
        const tags = new Set<string>();
        get().notes.forEach((n) => n.tags.forEach((t) => tags.add(t)));
        return [...tags].sort();
      },
    })),
    {
      name: "noter:notes",
      partialize: (s) => ({ notes: s.notes }),
    }
  )
);
