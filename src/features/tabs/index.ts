// ─────────────────────────────────────────────────────────────────────────────
// Tabs Feature Definition
// Registers the tab system with the kernel. The tab store is initialised here
// so any feature that starts after tabs can call openTab immediately.
// ─────────────────────────────────────────────────────────────────────────────

import type { FeatureDefinition } from "@/core";
import { useTabStore } from "./tab.store";

// Well-known events other features may emit to open a tab
export const TAB_EVENTS = {
  OPEN:   "tabs:open",
  CLOSE:  "tabs:close",
  FOCUS:  "tabs:focus",
} as const;

export interface TabOpenPayload {
  id?: string;
  title: string;
  componentKey: string;        // resolved by the shell's component registry
  props?: Record<string, unknown>;
  closeable?: boolean;
  pinned?: boolean;
}

export const tabsFeature: FeatureDefinition = {
  id:          "tabs",
  name:        "Tab Manager",
  version:     "1.0.0",
  description: "Desktop/tablet tab strip — open any page in a new tab.",

  async onInit({ logger }) {
    logger.info("Tab store ready.");
  },

  async onStart({ events, logger }) {
    // Listen for any feature requesting a tab to be opened
    events.on<TabOpenPayload>(TAB_EVENTS.OPEN, (payload) => {
      useTabStore.getState().openTab({
        title:       payload.title,
        id:          payload.id,
        component:   () => null, // Shell resolves actual component via componentKey
        props:       { ...(payload.props ?? {}), _componentKey: payload.componentKey },
        closeable:   payload.closeable ?? true,
        pinned:      payload.pinned ?? false,
      });
    });

    events.on<{ id: string }>(TAB_EVENTS.CLOSE, ({ id }) => {
      useTabStore.getState().closeTab(id);
    });

    events.on<{ id: string }>(TAB_EVENTS.FOCUS, ({ id }) => {
      useTabStore.getState().setActiveTab(id);
    });

    logger.info("Listening for tab events.");
  },

  async onStop({ events }) {
    // EventBus cleanup is handled by unsubscribe tokens, but since we didn't
    // store them here, we rely on the feature restart clearing its own handlers.
    // In a stricter system, store unsub tokens in a ref and call them here.
    events.emit("tabs:stopped");
  },
};
