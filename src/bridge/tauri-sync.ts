// ─────────────────────────────────────────────────────────────────────────────
// TauriSyncService — generic, event-driven file sync
//
// Listens to SYNC_EVENTS on the kernel event bus.
// Payloads carry all data needed — this layer imports nothing from features.
//
// In PWA mode this is a no-op.
// ─────────────────────────────────────────────────────────────────────────────

import { isTauri } from "@/bridge";
import { tauriCommands, type NoteFile } from "@/bridge/tauri-commands";
import { SYNC_EVENTS } from "@/features/notes/events";
import type { FeatureDefinition, EventBusInterface } from "@/core";

class TauriSync {
  private unsubs: Array<() => void> = [];

  async start(events: EventBusInterface) {
    if (!isTauri) return;

    await tauriCommands.ensureNotesDir();
    await this.hydrate(events);

    // NOTE_FLUSHED / NOTE_PINNED / NOTE_ARCHIVED — payload carries the note data
    const writeHandler = ({ note }: { id: string; note: NoteFile }) => {
      if (note) tauriCommands.writeNote(note).catch(console.error);
    };

    this.unsubs.push(
      events.on<{ id: string; note: NoteFile }>(SYNC_EVENTS.NOTE_FLUSHED,  writeHandler),
      events.on<{ id: string; note: NoteFile }>(SYNC_EVENTS.NOTE_PINNED,   writeHandler),
      events.on<{ id: string; note: NoteFile }>(SYNC_EVENTS.NOTE_ARCHIVED, writeHandler),
      events.on<{ id: string }>(SYNC_EVENTS.NOTE_DELETED, ({ id }) => {
        tauriCommands.deleteNote(id).catch(() => {/* already gone */});
      })
    );

    window.addEventListener("beforeunload", this.flushAll);
  }

  stop() {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    window.removeEventListener("beforeunload", this.flushAll);
  }

  // On close: read current notes from store and write all to disk
  private flushAll = async () => {
    // Dynamic import to avoid coupling at module level
    const { useNoteStore } = await import("@/features/notes/note.store");
    const notes = useNoteStore.getState().notes;
    for (const note of notes) {
      tauriCommands.writeNote({
        id: note.id, title: note.title, body: note.body,
        tags: note.tags, pinned: note.pinned, archived: note.archived,
        color: note.color ?? null, createdAt: note.createdAt, updatedAt: note.updatedAt,
      }).catch(console.error);
    }
  };

  private async hydrate(_events: EventBusInterface) {
    // Dynamic import to avoid module-level coupling
    const { useNoteStore } = await import("@/features/notes/note.store");
    const diskIds  = await tauriCommands.listNotes();
    const memNotes = useNoteStore.getState().notes;
    const memIds   = new Set(memNotes.map((n) => n.id));

    // Orphan disk files (deleted from store) → clean up
    for (const id of diskIds) {
      if (!memIds.has(id)) {
        await tauriCommands.deleteNote(id).catch(() => {});
      }
    }

    // In-memory notes missing from disk → write them
    for (const note of memNotes) {
      if (!diskIds.includes(note.id)) {
        await tauriCommands.writeNote({
          id: note.id, title: note.title, body: note.body,
          tags: note.tags, pinned: note.pinned, archived: note.archived,
          color: note.color ?? null, createdAt: note.createdAt, updatedAt: note.updatedAt,
        }).catch(console.error);
      }
    }
  }
}

const tauriSync = new TauriSync();

export const tauriSyncFeature: FeatureDefinition = {
  id:           "tauri-sync",
  name:         "Tauri File Sync",
  version:      "1.0.0",
  description:  "Generic event-driven sync of note store → disk. Zero feature imports.",
  dependencies: ["notes"],

  async onStart({ events, logger }) {
    if (!isTauri) { logger.info("PWA mode — file sync disabled."); return; }
    await tauriSync.start(events);
    logger.info("Event-driven file sync active.");
  },

  async onStop({ logger }) {
    tauriSync.stop();
    logger.info("File sync stopped.");
  },
};

// Re-export SYNC_EVENTS for features that need to listen to sync events
export { SYNC_EVENTS };
