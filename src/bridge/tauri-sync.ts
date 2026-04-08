// ─────────────────────────────────────────────────────────────────────────────
// TauriSyncService — event-driven, zero timers
//
// Writes to disk only on these events:
//   - "notes:flushed"  → editor flushed a draft (blur / tab switch / window blur)
//   - "notes:deleted"  → note was deleted
//   - "notes:pinned"   → pin toggled   (instant, cheap)
//   - "notes:archived" → archive toggled (instant, cheap)
//   - window "beforeunload" → app closing, flush everything dirty
//
// In PWA mode this entire module is a no-op.
// ─────────────────────────────────────────────────────────────────────────────

import { isTauri } from "@/bridge";
import { tauriCommands, type NoteFile } from "@/bridge/tauri-commands";
import { useNoteStore } from "@/features/notes/note.store";
import type { Note } from "@/features/notes/types";
import type { FeatureDefinition, EventBusInterface } from "@/core";

// Well-known events the editor emits after flushing its draft
export const SYNC_EVENTS = {
  NOTE_FLUSHED:  "notes:flushed",   // payload: { id: string }
  NOTE_DELETED:  "notes:deleted",   // payload: { id: string }
  NOTE_PINNED:   "notes:pinned",    // payload: { id: string }
  NOTE_ARCHIVED: "notes:archived",  // payload: { id: string }
} as const;

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

function getNoteById(id: string): Note | undefined {
  return useNoteStore.getState().notes.find((n: Note) => n.id === id);
}

async function writeToDisk(id: string): Promise<void> {
  const note = getNoteById(id);
  if (!note) return;
  await tauriCommands.writeNote(noteToFile(note));
}

async function deleteFromDisk(id: string): Promise<void> {
  await tauriCommands.deleteNote(id);
}

// ── Sync service ──────────────────────────────────────────────────────────────

class TauriSync {
  private unsubs: Array<() => void> = [];

  async start(events: EventBusInterface) {
    if (!isTauri) return;

    await tauriCommands.ensureNotesDir();
    await this.hydrate();

    // Listen for editor flush events → write that note immediately
    this.unsubs.push(
      events.on<{ id: string }>(SYNC_EVENTS.NOTE_FLUSHED, ({ id }) => {
        writeToDisk(id).catch(console.error);
      })
    );

    // Instant writes for metadata changes
    this.unsubs.push(
      events.on<{ id: string }>(SYNC_EVENTS.NOTE_PINNED, ({ id }) => {
        writeToDisk(id).catch(console.error);
      })
    );

    this.unsubs.push(
      events.on<{ id: string }>(SYNC_EVENTS.NOTE_ARCHIVED, ({ id }) => {
        writeToDisk(id).catch(console.error);
      })
    );

    // Delete from disk
    this.unsubs.push(
      events.on<{ id: string }>(SYNC_EVENTS.NOTE_DELETED, ({ id }) => {
        deleteFromDisk(id).catch(console.error);
      })
    );

    // Safety net: on app close, write every note that's newer on disk
    window.addEventListener("beforeunload", this.flushAll);
  }

  stop() {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    window.removeEventListener("beforeunload", this.flushAll);
  }

  // Write ALL notes to disk — only called on app close as a safety net
  private flushAll = () => {
    const notes = useNoteStore.getState().notes;
    for (const note of notes) {
      // Fire-and-forget — beforeunload can't await
      tauriCommands.writeNote(noteToFile(note)).catch(console.error);
    }
  };

  private async hydrate() {
    const diskIds  = await tauriCommands.listNotes();
    const { notes: memNotes } = useNoteStore.getState();
    const memIds   = new Set(memNotes.map((n: Note) => n.id));

    // Notes on disk but NOT in the store were deleted by the user.
    // Trust the store (localStorage) as source of truth — delete the orphan files.
    for (const id of diskIds) {
      if (!memIds.has(id)) {
        await tauriCommands.deleteNote(id).catch(() => {
          // File may already be gone — not an error
        });
      }
    }

    // Notes in memory but NOT on disk — write them to disk now.
    for (const note of memNotes) {
      if (!diskIds.includes(note.id)) {
        await tauriCommands.writeNote(noteToFile(note)).catch(console.error);
      }
    }
  }
}

const tauriSync = new TauriSync();

// ── Feature definition ────────────────────────────────────────────────────────

export const tauriSyncFeature: FeatureDefinition = {
  id:           "tauri-sync",
  name:         "Tauri File Sync",
  version:      "1.0.0",
  description:  "Event-driven sync of note store → disk. Zero timers.",
  dependencies: ["notes"],

  async onStart({ events, logger }) {
    if (!isTauri) {
      logger.info("PWA mode — file sync disabled.");
      return;
    }
    await tauriSync.start(events);
    logger.info("Event-driven file sync active.");
  },

  async onStop({ logger }) {
    tauriSync.stop();
    logger.info("File sync stopped.");
  },
};