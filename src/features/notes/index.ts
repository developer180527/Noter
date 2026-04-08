import type { FeatureDefinition } from "@/core";
import { useNoteStore } from "./note.store";
import { useSidebarStore } from "@/features/sidebar/sidebar.store";

export const NOTE_EVENTS = {
  CREATE:      "notes:create",
  OPEN:        "notes:open",
  DELETE:      "notes:delete",
  UPDATE:      "notes:update",
} as const;

export const notesFeature: FeatureDefinition = {
  id:           "notes",
  name:         "Notes",
  version:      "1.0.0",
  description:  "Core note creation, editing, and management.",
  dependencies: ["sidebar"],

  async onInit({ logger }) {
    const { notes, createNote } = useNoteStore.getState();
    // Seed a welcome note if the app is fresh
    if (notes.length === 0) {
      createNote({
        title: "Welcome to noter",
        body:  "Start writing. Your notes are saved automatically.\n\nPress **⌘N** to create a new note.",
        tags:  ["welcome"],
        pinned: true,
      });
      logger.info("Seeded welcome note.");
    }
  },

  async onStart({ events, logger }) {
    // Register in sidebar
    useSidebarStore.getState().registerItem({
      id:           "notes",
      label:        "Notes",
      icon:         "FileText",
      componentKey: "notes-page",
    });

    // Handle note events
    events.on<{ title?: string; body?: string }>(NOTE_EVENTS.CREATE, (payload) => {
      useNoteStore.getState().createNote(payload);
    });

    events.on<{ id: string }>(NOTE_EVENTS.OPEN, ({ id }) => {
      useNoteStore.getState().setActiveNote(id);
    });

    events.on<{ id: string }>(NOTE_EVENTS.DELETE, ({ id }) => {
      useNoteStore.getState().deleteNote(id);
    });

    logger.info("Notes feature started.");
  },

  async onStop() {
    useSidebarStore.getState().unregisterItem("notes");
  },
};
