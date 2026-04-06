import { useRef, useState, useCallback, type MouseEvent } from "react";
import { X, Circle } from "lucide-react";
import { clsx } from "clsx";
import { useTabStore } from "../tab.store";
import type { Tab } from "../types";

interface ContextMenu {
  tabId: string;
  x: number;
  y: number;
}

function TabContextMenu({ menu, onClose }: { menu: ContextMenu; onClose: () => void }) {
  const { closeTab, closeOtherTabs, closeTabsToRight, tabs } = useTabStore();
  const tab = tabs.find((t) => t.id === menu.tabId);
  if (!tab) return null;

  const item = (label: string, action: () => void, danger = false) => (
    <button
      key={label}
      onClick={() => { action(); onClose(); }}
      className={clsx(
        "w-full text-left px-3 py-1.5 text-xs font-sans rounded-sm transition-colors",
        danger ? "text-danger hover:bg-danger/10" : "text-ink/80 hover:bg-raised hover:text-ink"
      )}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        style={{ left: menu.x, top: menu.y }}
        className="fixed z-50 min-w-[160px] bg-overlay border border-border rounded-md shadow-2xl p-1 animate-fade-in"
      >
        {tab.closeable && item("Close Tab", () => closeTab(menu.tabId))}
        {item("Close Other Tabs", () => closeOtherTabs(menu.tabId))}
        {item("Close Tabs to Right", () => closeTabsToRight(menu.tabId))}
      </div>
    </>
  );
}

function TabPill({ tab, isActive }: { tab: Tab; isActive: boolean }) {
  const { setActiveTab, closeTab } = useTabStore();
  const Icon = tab.icon;

  return (
    <button
      onClick={() => setActiveTab(tab.id)}
      className={clsx(
        "group relative flex items-center gap-1.5 h-full px-3 text-2xs font-sans font-medium",
        "border-r border-border transition-colors duration-100 select-none shrink-0",
        "max-w-[180px] min-w-[80px]",
        isActive
          ? "bg-surface text-ink"
          : "bg-base text-muted hover:bg-surface/60 hover:text-ink/70"
      )}
      title={tab.title}
    >
      {isActive && (
        <span className="absolute top-0 left-0 right-0 h-[2px] bg-amber rounded-b-none" />
      )}
      {Icon && <Icon size={11} className="shrink-0 opacity-70" />}
      <span className="truncate flex-1 text-left leading-none">{tab.title}</span>
      {tab.dirty && !isActive ? (
        <Circle size={6} className="shrink-0 fill-amber text-amber" />
      ) : tab.closeable ? (
        <span
          role="button"
          onClick={(e: MouseEvent) => { e.stopPropagation(); closeTab(tab.id); }}
          className={clsx(
            "shrink-0 rounded-sm p-0.5 transition-colors",
            isActive
              ? "opacity-50 hover:opacity-100 hover:bg-border"
              : "opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:bg-border"
          )}
        >
          <X size={10} />
        </span>
      ) : null}
    </button>
  );
}

export function TabBar() {
  const { tabs, activeTabId } = useTabStore();
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  }, []);


  return (
    <>
      <div
        className="flex h-9 bg-base border-b border-border overflow-hidden"
        data-tauri-drag-region
      >
        {/* Scrollable tab list — only as wide as its tabs */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex overflow-x-auto overflow-y-hidden scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              className="contents"
            >
              <TabPill tab={tab} isActive={tab.id === activeTabId} />
            </div>
          ))}
        </div>

        {/* Empty drag region — fills remaining space, draggable */}
        <div className="flex-1 min-w-4" data-tauri-drag-region />
      </div>

      {contextMenu && (
        <TabContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
      )}
    </>
  );
}