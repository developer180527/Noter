// src/shell/activityBar.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivityBarPosition = "left" | "right" | "bottom";

interface ActivityBarState {
  position:      ActivityBarPosition;
  order:         string[];
  magnification: boolean;
}

interface ActivityBarActions {
  setPosition(pos: ActivityBarPosition): void;
  setOrder(order: string[]): void;
  resetOrder(): void;
  setMagnification(enabled: boolean): void;
}

export const useActivityBarStore = create<ActivityBarState & ActivityBarActions>()(
  persist(
    (set) => ({
      position:      "left",
      order:         [],
      magnification: true,   // on by default

      setPosition:      (position)      => set({ position }),
      setOrder:         (order)         => set({ order }),
      resetOrder:       ()              => set({ order: [] }),
      setMagnification: (magnification) => set({ magnification }),
    }),
    { name: "noter:activity-bar-v1" }
  )
);