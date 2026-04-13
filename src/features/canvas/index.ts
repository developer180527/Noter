import type { FeatureDefinition } from "@/core";
import { CanvasPage } from "./components/CanvasPage";
import { CanvasList } from "./components/CanvasList";
import { SIDEBAR_EVENTS } from "@/features/sidebar/index";

const unsubs: Array<() => void> = [];

export const canvasFeature: FeatureDefinition = {
  id:           "canvas",
  name:         "Canvas",
  version:      "1.0.0",
  description:  "Infinite drawing canvas with shapes, arrows, and note references.",
  dependencies: ["sidebar", "tabs", "notes"],

  async onStart({ events, slots, logger }) {
    slots.register("page:canvas-page", CanvasPage);
    slots.register("canvas.list",      CanvasList);

    events.emit(SIDEBAR_EVENTS.REGISTER_ITEM, {
      id:           "canvas",
      label:        "Canvas",
      icon:         "PenLine",
      componentKey: "canvas-page",
      isPanelItem:  false,
    });

    // Refresh persisted tab if it exists
    const { useTabStore } = await import("@/features/tabs/tab.store");
    const tabStore = useTabStore.getState();
    const existing = tabStore.tabs.find((t) => t.id === "page-canvas-page");
    if (existing) {
      tabStore.updateTab("page-canvas-page", { props: { _componentKey: "canvas-page" } });
    }

    logger.info("Canvas feature started.");
  },

  async onStop({ events, slots }) {
    unsubs.forEach((u) => u());
    unsubs.length = 0;
    slots.unregister("page:canvas-page");
    slots.unregister("canvas.list");
    events.emit(SIDEBAR_EVENTS.UNREGISTER_ITEM, { id: "canvas" });
  },
};
