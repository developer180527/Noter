// ─────────────────────────────────────────────────────────────────────────────
// TabContent
// Renders ALL tab components but only shows the active one.
// This "keep-alive" pattern preserves scroll position, editor state, etc.
// across tab switches without unmounting.
// ─────────────────────────────────────────────────────────────────────────────

import { useTabStore } from "../tab.store";
import type { ComponentRegistry } from "@/shell/component-registry";

interface TabContentProps {
  registry: ComponentRegistry;
}

export function TabContent({ registry }: TabContentProps) {
  const { tabs, activeTabId } = useTabStore();

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center space-y-3 animate-fade-in">
          <p className="font-serif text-4xl text-muted/40 italic select-none">noter</p>
          <p className="text-xs text-subtle font-sans">Open a note or press ⌘N to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      {tabs.map((tab) => {
        // Resolve the actual component via the shell registry
        const componentKey = (tab.props?._componentKey as string | undefined) ?? "";
        const Component = componentKey
          ? (registry[componentKey] ?? tab.component)
          : tab.component;

        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            className="absolute inset-0"
            style={{ display: isActive ? "flex" : "none" }}
            aria-hidden={!isActive}
          >
            <div className="flex-1 overflow-auto">
              <Component tabId={tab.id} {...tab.props} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
