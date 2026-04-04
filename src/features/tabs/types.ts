import type { ComponentType } from "react";

// ── Tab ───────────────────────────────────────────────────────────────────────

export interface Tab {
  id: string;
  /** Displayed in the tab strip. */
  title: string;
  /** Lucide icon component or any ReactNode producer. */
  icon?: ComponentType<{ size?: number; className?: string }>;
  /** The component to render when this tab is active. */
  component: ComponentType<TabComponentProps>;
  /** Props forwarded to the tab component. */
  props?: Record<string, unknown>;
  /** Whether the user can close this tab. Pinned system tabs set this false. */
  closeable: boolean;
  /** Pinned tabs sit to the left and cannot be reordered past unpinned tabs. */
  pinned?: boolean;
  /** True if the tab has unsaved changes — shows a dirty indicator. */
  dirty?: boolean;
  /** Metadata for serialisation / history restoration. */
  meta?: Record<string, unknown>;
}

export interface TabComponentProps {
  tabId: string;
  [key: string]: unknown;
}

// ── Tab Store State ───────────────────────────────────────────────────────────

export interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
}

// ── Tab Store Actions ─────────────────────────────────────────────────────────

export interface TabActions {
  openTab(tab: Omit<Tab, "id"> & { id?: string }): string;
  closeTab(id: string): void;
  setActiveTab(id: string): void;
  reorderTabs(fromIndex: number, toIndex: number): void;
  updateTab(id: string, patch: Partial<Omit<Tab, "id">>): void;
  closeOtherTabs(id: string): void;
  closeTabsToRight(id: string): void;
}

export type TabStore = TabState & TabActions;
