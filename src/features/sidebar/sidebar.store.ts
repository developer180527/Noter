// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Store — VS Code style
// The sidebar is now a fixed activity bar (icons only) + a resizable panel.
// activePanel: which panel is open (null = all panels collapsed)
// panelWidth:  width of the secondary panel (NoteList etc)
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SidebarNavItem {
  id:            string;
  label:         string;
  icon:          string;
  componentKey:  string;
  isPanelItem:   boolean;
  linkedTabId?:  string;   // for panel items: the tab ID that shows this panel's content
  badge?:        number;
}

interface SidebarState {
  activePanel:  string | null; // id of the open panel, null = collapsed
  panelWidth:   number;        // secondary panel width in px
  items:        SidebarNavItem[];
}

interface SidebarActions {
  setActivePanel(id: string | null): void;
  togglePanel(id: string): void;
  setPanelWidth(w: number): void;
  registerItem(item: SidebarNavItem): void;
  unregisterItem(id: string): void;
  updateItem(id: string, patch: Partial<SidebarNavItem>): void;
}

export type SidebarStore = SidebarState & SidebarActions;

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      activePanel: "notes",   // notes panel open by default
      panelWidth:  220,
      items:       [],

      setActivePanel: (id) => set({ activePanel: id }),

      togglePanel: (id) =>
        set((s) => ({ activePanel: s.activePanel === id ? null : id })),

      setPanelWidth: (w) =>
        set({ panelWidth: Math.max(180, Math.min(480, w)) }),

      registerItem: (item) =>
        set((s) => {
          if (s.items.find((i) => i.id === item.id)) return s;
          return { items: [...s.items, item] };
        }),

      unregisterItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateItem: (id, patch) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
    }),
    {
      name: "noter:sidebar-v2",
      partialize: (s) => ({
        activePanel: s.activePanel,
        panelWidth:  s.panelWidth,
      }),
    }
  )
);