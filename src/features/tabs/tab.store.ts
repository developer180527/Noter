import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { Tab, TabStore } from "./types";

export const useTabStore = create<TabStore>()(
  persist(
    immer((set, get) => ({
    tabs: [],
    activeTabId: null,

    openTab(tabDef) {
      const id = tabDef.id ?? nanoid(8);

      // If a tab with this ID already exists, just activate it
      const existing = get().tabs.find((t) => t.id === id);
      if (existing) {
        set((s) => { s.activeTabId = id; });
        return id;
      }

      const tab: Tab = { ...tabDef, id };

      set((s) => {
        // Pinned tabs go before unpinned tabs
        if (tab.pinned) {
          const lastPinnedIdx = s.tabs.reduceRight(
            (acc, t, i) => (t.pinned && acc === -1 ? i : acc),
            -1
          );
          s.tabs.splice(lastPinnedIdx + 1, 0, tab);
        } else {
          s.tabs.push(tab);
        }
        s.activeTabId = id;
      });

      return id;
    },

    closeTab(id) {
      set((s) => {
        const idx = s.tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;

        s.tabs.splice(idx, 1);

        // If we closed the active tab, activate the nearest remaining tab
        if (s.activeTabId === id) {
          const next = s.tabs[idx] ?? s.tabs[idx - 1];
          s.activeTabId = next?.id ?? null;
        }
      });
    },

    setActiveTab(id) {
      set((s) => { s.activeTabId = id; });
    },

    reorderTabs(fromIndex, toIndex) {
      set((s) => {
        const [tab] = s.tabs.splice(fromIndex, 1);
        s.tabs.splice(toIndex, 0, tab);
      });
    },

    updateTab(id, patch) {
      set((s) => {
        const tab = s.tabs.find((t) => t.id === id);
        if (tab) Object.assign(tab, patch);
      });
    },

    closeOtherTabs(id) {
      set((s) => {
        s.tabs = s.tabs.filter((t) => t.id === id || !t.closeable);
        s.activeTabId = id;
      });
    },

    closeTabsToRight(id) {
      set((s) => {
        const idx = s.tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;
        const toClose = s.tabs.slice(idx + 1).filter((t) => t.closeable);
        s.tabs = s.tabs.filter((t) => !toClose.some((c) => c.id === t.id));
        if (toClose.some((t) => t.id === s.activeTabId)) {
          s.activeTabId = id;
        }
      });
    },
  })),
  {
    name: "noter:tabs-v1",
    partialize: (s) => ({
      activeTabId: s.activeTabId,
      tabs: s.tabs.map((t) => ({
        id:        t.id,
        title:     t.title,
        closeable: t.closeable,
        pinned:    t.pinned ?? false,
        dirty:     false,
        props:     t.props,
        meta:      t.meta,
      })),
    }),
    merge: (persisted, current) => {
      const p = persisted;
      if (!p || typeof p !== 'object') return current;
      const pd = p as { tabs?: unknown[]; activeTabId?: string | null };
      if (!pd.tabs) return current;
      const tabs = pd.tabs.map((t) => ({
        ...(t as object),
        component: () => null,
      }));
      return { ...current, tabs: tabs, activeTabId: pd.activeTabId ?? null } as unknown as TabStore;
    },
  }
));

