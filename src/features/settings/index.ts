import type { FeatureDefinition } from "@/core";
import { useSidebarStore } from "@/features/sidebar/sidebar.store";

export const settingsFeature: FeatureDefinition = {
  id:           "settings",
  name:         "Settings",
  version:      "1.0.0",
  description:  "Application settings and kernel inspector.",
  dependencies: ["sidebar"],

  async onStart({ logger }) {
    useSidebarStore.getState().registerItem({
      id:           "settings",
      label:        "Settings",
      icon:         "Settings",
      componentKey: "settings-page",
    });
    logger.info("Settings feature started.");
  },

  async onStop() {
    useSidebarStore.getState().unregisterItem("settings");
  },
};
