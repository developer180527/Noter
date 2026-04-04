import type { FeatureDefinition } from "@/core";
import { useSidebarStore, type SidebarNavItem } from "./sidebar.store";

export const SIDEBAR_EVENTS = {
  REGISTER_ITEM:   "sidebar:register-item",
  UNREGISTER_ITEM: "sidebar:unregister-item",
  TOGGLE:          "sidebar:toggle",
} as const;

export const sidebarFeature: FeatureDefinition = {
  id:          "sidebar",
  name:        "Sidebar",
  version:     "1.0.0",
  description: "Collapsible navigation sidebar.",

  async onStart({ events, logger }) {
    events.on(SIDEBAR_EVENTS.TOGGLE, () => {
      useSidebarStore.getState().toggle();
    });

    events.on<SidebarNavItem>(SIDEBAR_EVENTS.REGISTER_ITEM, (item) => {
      useSidebarStore.getState().registerItem(item);
    });

    events.on<{ id: string }>(SIDEBAR_EVENTS.UNREGISTER_ITEM, ({ id }) => {
      useSidebarStore.getState().unregisterItem(id);
    });

    logger.info("Sidebar ready.");
  },
};
