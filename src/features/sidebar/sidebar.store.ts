import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: string;           // lucide icon name
  componentKey: string;   // what to open in the tab/main area
  badge?: number;         // notification badge
  section?: string;       // visual grouping label
}

interface SidebarState {
  collapsed: boolean;
  width: number;          // px, only relevant when not collapsed
  activeItemId: string | null;
  items: SidebarNavItem[];
}

interface SidebarActions {
  toggle(): void;
  setCollapsed(val: boolean): void;
  setWidth(w: number): void;
  setActiveItem(id: string | null): void;
  registerItem(item: SidebarNavItem): void;
  unregisterItem(id: string): void;
  updateItem(id: string, patch: Partial<SidebarNavItem>): void;
}

export type SidebarStore = SidebarState & SidebarActions;

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed:    false,
      width:        220,
      activeItemId: null,
      items:        [],

      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (val) => set({ collapsed: val }),
      setWidth: (w) => set({ width: Math.max(160, Math.min(400, w)) }),
      setActiveItem: (id) => set({ activeItemId: id }),

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
      name: "noter:sidebar",
      partialize: (s) => ({ collapsed: s.collapsed, width: s.width }),
    }
  )
);
