// src/features/settings/theme.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_THEME } from "./themes";

interface ThemeState {
  activeTheme: string;
}

interface ThemeActions {
  setTheme(id: string): void;
}

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set) => ({
      activeTheme: DEFAULT_THEME,
      setTheme: (id) => set({ activeTheme: id }),
    }),
    { name: "noter:theme-v1" }
  )
);