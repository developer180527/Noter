// ─────────────────────────────────────────────────────────────────────────────
// TauriSyncService
// When running inside Tauri, this service mirrors the in-memory Zustand note
// store to individual JSON files on disk. It subscribes to store changes and
// debounces writes so the disk is never hammered on every keystroke.
//
// In PWA mode this entire module is a no-op — isTauri is false.
// ─────────────────────────────────────────────────────────────────────────────

import { isTauri } from "@/bridge";
import { tauriCommands, type NoteFile } from "@/bridge/tauri-commands";
import { useNoteStore } from "@/features/notes/note.store";
import type { Note } from "@/features/notes/types";
import type { FeatureDefinition } from "@/core";

const DEBOUNCE_MS = 1200;

function noteToFile(note: Note): NoteFile {
  return {
    id:        note.id,
    title:     note.title,
    body:      note.body,
    tags:      note.tags,
    pinned:    note.pinned,
    archived:  note.archived,
    color:     note.color ?? null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

class TauriSync {
  private pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
  private knownIds      = new Set<string>();
  private unsub?: () => void;

  async start() {
    if (!isTauri) return;

    await tauriCommands.ensureNotesDir();

    // Load all notes from disk on first start
    await this.hydrate();

    // Subscribe to store mutations
    this.unsub = useNoteStore.subscribe((state, prev) => {
      this.handleStoreChange(state.notes, prev.notes);
    });
  }

  stop() {
    this.unsub?.();
    this.pendingWrites.forEach((timer) => clearTimeout(timer));
    this.pendingWrites.clear();
  }

  private async hydrate() {
    const ids = await tauriCommands.listNotes();
    const { notes: memNotes, createNote } = useNoteStore.getState();
    const memIds = new Set(memNotes.map((n) => n.id));

    for (const id of ids) {
      this.knownIds.add(id);
      if (!memIds.has(id)) {
        // Note exists on disk but not in memory — load it
        const file = await tauriCommands.readNote(id);
        createNote({
          title:    file.title,
          body:     file.body,
          tags:     file.tags,
          pinned:   file.pinned,
          archived: file.archived,
        });
      }
    }

    // Write any in-memory notes that aren't on disk yet
    for (const note of memNotes) {
      if (!ids.includes(note.id)) {
        await tauriCommands.writeNote(noteToFile(note));
        this.knownIds.add(note.id);
      }
    }
  }

  private handleStoreChange(notes: Note[], prev: Note[]) {
    const currentIds = new Set(notes.map((n) => n.id));

    // Detect deletions
    for (const id of [...this.knownIds]) {
      if (!currentIds.has(id)) {
        this.knownIds.delete(id);
        tauriCommands.deleteNote(id).catch(console.error);
      }
    }

    // Detect creates + updates — debounce writes
    for (const note of notes) {
      const prevNote = prev.find((n) => n.id === note.id);
      if (!prevNote || prevNote.updatedAt !== note.updatedAt) {
        this.scheduleWrite(note);
      }
    }
  }

  private scheduleWrite(note: Note) {
    const existing = this.pendingWrites.get(note.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.pendingWrites.delete(note.id);
      this.knownIds.add(note.id);
      await tauriCommands.writeNote(noteToFile(note));
    }, DEBOUNCE_MS);

    this.pendingWrites.set(note.id, timer);
  }
}

// Singleton instance
const tauriSync = new TauriSync();

// ── Feature definition ────────────────────────────────────────────────────────
// Register this as a feature so the kernel manages its lifecycle cleanly.

export const tauriSyncFeature: FeatureDefinition = {
  id:           "tauri-sync",
  name:         "Tauri File Sync",
  version:      "1.0.0",
  description:  "Syncs the note store to disk when running inside Tauri.",
  dependencies: ["notes"],

  async onStart({ logger }) {
    if (!isTauri) {
      logger.info("PWA mode — file sync disabled.");
      return;
    }
    await tauriSync.start();
    logger.info("File sync active.");
  },

  async onStop({ logger }) {
    tauriSync.stop();
    logger.info("File sync stopped.");
  },
};
