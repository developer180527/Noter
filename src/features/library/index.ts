import type { FeatureDefinition } from "@/core";
import { LibraryPage } from "./components/LibraryPage";
import { SIDEBAR_EVENTS } from "@/features/sidebar/index";

const unsubs: Array<() => void> = [];

export const libraryFeature: FeatureDefinition = {
  id:           "library",
  name:         "Library",
  version:      "1.0.0",
  description:  "Browse all notes in a sortable, filterable table.",
  dependencies: ["sidebar", "notes"],

  async onStart({ events, slots, logger }) {
    slots.register("page:library-page", LibraryPage);

    events.emit(SIDEBAR_EVENTS.REGISTER_ITEM, {
      id:           "library",
      label:        "Library",
      icon:         "Library",
      componentKey: "library-page",
      isPanelItem:  false,
    });

    // Refresh any persisted library tab so _componentKey is always correct
    const { useTabStore } = await import("@/features/tabs/tab.store");
    const tabStore = useTabStore.getState();
    const existing = tabStore.tabs.find((t) => t.id === "page-library-page");
    if (existing) {
      tabStore.updateTab("page-library-page", { props: { _componentKey: "library-page" } });
    }

    logger.info("Library feature started.");
  },

  async onStop({ events, slots }) {
    unsubs.forEach((u) => u());
    unsubs.length = 0;
    slots.unregister("page:library-page");
    events.emit(SIDEBAR_EVENTS.UNREGISTER_ITEM, { id: "library" });
  },
};