import { useSyncExternalStore } from "react";
import { useSidebarStore } from "../sidebar.store";
import { useTabStore } from "@/features/tabs/tab.store";
import { useKernel } from "@/core";

export function SecondaryPanel() {
  const { activePanel, items, panelWidth } = useSidebarStore();
  const { activeTabId } = useTabStore();
  const kernel = useKernel();

  useSyncExternalStore(
    kernel.slots.subscribe,
    kernel.slots.getSnapshot,
    kernel.slots.getSnapshot
  );

  if (!activePanel) return null;

  const panelItem = items.find((i) => i.id === activePanel);
  if (panelItem?.linkedTabId && activeTabId !== panelItem.linkedTabId) return null;

  const PanelContent = kernel.slots.get(`${activePanel}.list`);
  if (!PanelContent) return null;

  return (
    <div
      className="flex flex-col bg-surface shrink-0 overflow-hidden"
      style={{ width: panelWidth }}
    >
      <PanelContent />
    </div>
  );
}