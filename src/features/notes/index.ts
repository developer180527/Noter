import type { FeatureDefinition } from "@/core";
import { useNoteStore, _initStoreEmitter } from "./note.store";
import { useSidebarStore } from "@/features/sidebar/sidebar.store";
import { useTabStore } from "@/features/tabs/tab.store";
import { NoteList }    from "./components/NoteList";
import { NotesPage }   from "./components/NotesPage";
import { NoteViewer }  from "./components/NoteViewer";
import { NOTE_EVENTS, SYNC_EVENTS } from "./events";

export { NOTE_EVENTS, SYNC_EVENTS };
export const NOTES_TAB_ID = "tab-notes-page";

const unsubs: Array<() => void> = [];

export const notesFeature: FeatureDefinition = {
  id:           "notes",
  name:         "Notes",
  version:      "1.0.0",
  description:  "Core note creation, editing, and management.",
  dependencies: ["sidebar", "tabs"],

  async onInit({ logger }) {
    const { notes, createNote } = useNoteStore.getState();
    if (notes.length === 0) {
      createNote({
        title: "Welcome to noter",
        body:  "Start writing. Your notes are saved automatically.",
        tags:  ["welcome"],
        pinned: true,
      });
      logger.info("Seeded welcome note.");
    }
  },

  async onStart({ events, slots, logger }) {
    // Inject event emitter into store — no more Kernel.getInstance() in store
    _initStoreEmitter((event, payload) => events.emit(event, payload));

    // Register UI into kernel slots — zero direct shell/feature imports
    slots.register("page:notes-page",    NotesPage);
    slots.register("page:note-viewer",   NoteViewer);
    slots.register("notes.list",         NoteList);

    // Register in activity bar via sidebar store
    useSidebarStore.getState().registerItem({
      id:           "notes",
      label:        "Notes",
      icon:         "FileText",
      componentKey: "notes-page",
      isPanelItem:  true,
      linkedTabId:  NOTES_TAB_ID,
    });

    // Seed the Notes tab if it doesn't exist yet
    const tabStore = useTabStore.getState();
    const existingTab = tabStore.tabs.find((t) => t.id === NOTES_TAB_ID);
    if (existingTab) {
      // Ensure persisted tab always has the correct componentKey — it may
      // be stale from an older session before slot-based resolution was added.
      tabStore.updateTab(NOTES_TAB_ID, {
        props: { _componentKey: "notes-page" },
      });
    } else {
      tabStore.openTab({
        id:        NOTES_TAB_ID,
        title:     "Notes",
        component: () => null,
        props:     { _componentKey: "notes-page" },
        closeable: true,
        pinned:    false,
      });
    }

    // Store unsub tokens so onStop can clean up properly
    unsubs.push(
      events.on<{ title?: string; body?: string }>(NOTE_EVENTS.CREATE, (payload) => {
        useNoteStore.getState().createNote(payload);
      }),
      events.on<{ id: string }>(NOTE_EVENTS.OPEN, ({ id }) => {
        useNoteStore.getState().setActiveNote(id);
      }),
      events.on<{ id: string }>(NOTE_EVENTS.DELETE, ({ id }) => {
        useNoteStore.getState().deleteNote(id);
      })
    );

    logger.info("Notes feature started.");
  },

  async onStop({ slots }) {
    // Clean up all event subscriptions
    unsubs.forEach((u) => u());
    unsubs.length = 0;

    // Unregister slots and sidebar item
    slots.unregister("page:notes-page");
    slots.unregister("page:note-viewer");
    slots.unregister("notes.list");
    useSidebarStore.getState().unregisterItem("notes");
  },
};