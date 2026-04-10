import type { FeatureDefinition } from "@/core";
import { SettingsPage } from "./components/SettingsPage";
import { SIDEBAR_EVENTS } from "@/features/sidebar/index";

export const settingsFeature: FeatureDefinition = {
  id:           "settings",
  name:         "Settings",
  version:      "1.0.0",
  description:  "Application settings and kernel inspector.",
  dependencies: ["sidebar"],

  async onStart({ events, slots, logger }) {
    slots.register("page:settings-page", SettingsPage);

    events.emit(SIDEBAR_EVENTS.REGISTER_ITEM, {
      id:           "settings",
      label:        "Settings",
      icon:         "Settings",
      componentKey: "settings-page",
      isPanelItem:  false,
    });

    // Refresh any persisted settings tab so _componentKey is always correct
    const { useTabStore } = await import("@/features/tabs/tab.store");
    const tabStore = useTabStore.getState();
    const settingsTabId = "page-settings-page";
    const existing = tabStore.tabs.find((t) => t.id === settingsTabId);
    if (existing) {
      tabStore.updateTab(settingsTabId, { props: { _componentKey: "settings-page" } });
    }

    logger.info("Settings feature started.");
  },

  async onStop({ events, slots }) {
    slots.unregister("page:settings-page");
    events.emit(SIDEBAR_EVENTS.UNREGISTER_ITEM, { id: "settings" });
  },
};