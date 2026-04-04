import type { FeatureDefinition } from "@/core";
import { useSidebarStore } from "@/features/sidebar/sidebar.store";

export const libraryFeature: FeatureDefinition = {
  id:           "library",
  name:         "Library",
  version:      "1.0.0",
  description:  "Browse all notes in a sortable, filterable table.",
  dependencies: ["sidebar", "notes"],

  async onStart({ logger }) {
    useSidebarStore.getState().registerItem({
      id:           "library",
      label:        "Library",
      icon:         "Library",
      componentKey: "library-page",
      section:      "Library",
    });
    logger.info("Library feature started.");
  },

  async onStop() {
    useSidebarStore.getState().unregisterItem("library");
  },
};
