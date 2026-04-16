import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SettingsSection =
  | "general"
  | "notes"
  | "appearance"
  | "permissions"
  | "about";

export interface AppSettings {
  activeSection: SettingsSection;

  // Notes / Editor
  autoSaveDelay:    number;
  editorFontSize:   number;
  editorLineHeight: number;
  spellCheck:       boolean;
  defaultNoteTitle: string;

  // Appearance
  reducedMotion: boolean;

  // State persistence
  persistWindowSize:     boolean;  // restore last window dimensions on launch
  persistWorkflowState:  boolean;  // restore open tabs and active note on launch

  // Permissions
  permCrashReports:  boolean;
  permAnalytics:     boolean;
  permAutoUpdate:    boolean;
  permFileAccess:    boolean;
  permClipboard:     boolean;
  permNotifications: boolean;
}

interface SettingsActions {
  setSection(section: SettingsSection): void;
  set<K extends keyof Omit<AppSettings, "activeSection">>(
    key: K,
    value: AppSettings[K]
  ): void;
  reset(): void;
}

const DEFAULTS: AppSettings = {
  activeSection:    "general",
  autoSaveDelay:    800,
  editorFontSize:   16,
  editorLineHeight: 1.85,
  spellCheck:       true,
  defaultNoteTitle: "Untitled",
  reducedMotion:    false,
  persistWindowSize:    true,
  persistWorkflowState: true,
  permCrashReports:  true,
  permAnalytics:     false,
  permAutoUpdate:    true,
  permFileAccess:    true,
  permClipboard:     false,
  permNotifications: false,
};

export const useSettingsStore = create<AppSettings & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setSection: (section) => set({ activeSection: section }),
      set: (key, value) => set({ [key]: value } as Partial<AppSettings>),
      reset: () => set(DEFAULTS),
    }),
    {
      name: "noter:settings-v1",
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { setSection, set: _set, reset, ...rest } = s;
        void setSection; void reset;
        return rest;
      },
    }
  )
);