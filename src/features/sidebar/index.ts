import type { FeatureDefinition } from "@/core";
import { useSidebarStore, type SidebarNavItem } from "./sidebar.store";
import { ActivityBar }    from "./components/ActivityBar";
import { SecondaryPanel } from "./components/SecondaryPanel";

export const SIDEBAR_EVENTS = {
  REGISTER_ITEM:   "sidebar:register-item",
  UNREGISTER_ITEM: "sidebar:unregister-item",
  TOGGLE:          "sidebar:toggle",
} as const;

export const sidebarFeature: FeatureDefinition = {
  id:          "sidebar",
  name:        "Sidebar",
  version:     "1.0.0",
  description: "Activity bar and secondary panel. Registers UI into kernel slots.",

  async onStart({ events, slots, logger }) {
    // Register UI components into kernel slots.
    // The shell renders these via <KernelSlot name="..." /> — no direct imports.
    slots.register("sidebar.activityBar", ActivityBar);
    slots.register("sidebar.panel",       SecondaryPanel);

    events.on(SIDEBAR_EVENTS.TOGGLE, () => {
      const { activePanel } = useSidebarStore.getState();
      useSidebarStore.getState().setActivePanel(activePanel ? null : "notes");
    });

    events.on<SidebarNavItem>(SIDEBAR_EVENTS.REGISTER_ITEM, (item) => {
      useSidebarStore.getState().registerItem(item);
    });

    events.on<{ id: string }>(SIDEBAR_EVENTS.UNREGISTER_ITEM, ({ id }) => {
      useSidebarStore.getState().unregisterItem(id);
    });

    logger.info("Sidebar ready — slots registered.");
  },
};