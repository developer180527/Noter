// ─────────────────────────────────────────────────────────────────────────────
// Component Registry
// Maps string keys → React components. The tab system stores componentKey
// strings; the shell resolves them to actual components here.
//
// To add a new page:
//   1. Create your component in the appropriate feature folder.
//   2. Add it to COMPONENT_REGISTRY below.
//   3. Register its sidebar item via the feature's onStart lifecycle hook.
// ─────────────────────────────────────────────────────────────────────────────

import type { ComponentType } from "react";
import type { TabComponentProps } from "@/features/tabs/types";
import { NotesPage }   from "@/features/notes/components/NotesPage";
import { SettingsPage } from "@/features/settings/components/SettingsPage";
import { LibraryPage }  from "@/features/library/components/LibraryPage";

export type ComponentRegistry = Record<string, ComponentType<TabComponentProps>>;

export const COMPONENT_REGISTRY: ComponentRegistry = {
  "notes-page":    NotesPage,
  "settings-page": SettingsPage,
  "library-page":  LibraryPage,
};
