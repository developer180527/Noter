import { useState, useEffect, useCallback } from "react";
import { useTabStore } from "../tab.store";
import { useKernel } from "@/core";
import type { TabComponentProps } from "../types";

export function TabContent(_props: { registry?: Record<string, unknown> }) {
  const { tabs, activeTabId } = useTabStore();
  const kernel = useKernel();
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  // Subscribe to slot registrations so we re-render when features finish booting
  useEffect(() => {
    // Subscribe via the SlotRegistry's listener API
    const unsub = kernel.slots.subscribe(bump);
    // Also bump once immediately in case slots already registered before we mounted
    bump();
    return unsub;
  }, [kernel, bump]);

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

  const activeTab = tabs.find((t) => t.id === activeTabId);
  if (!activeTab) return null;

  const componentKey = (activeTab.props?._componentKey as string | undefined) ?? "";
  const Component = (
    componentKey ? kernel.slots.get(`page:${componentKey}`) : undefined
  ) as React.ComponentType<TabComponentProps> | undefined;

  if (!Component) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <p className="text-xs text-subtle font-mono">Loading {activeTab.title}…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden" key={activeTab.id}>
      <Component tabId={activeTab.id} {...activeTab.props} />
    </div>
  );
}