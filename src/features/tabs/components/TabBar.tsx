import { useRef, useState, useCallback, useEffect, type MouseEvent } from "react";
import { X, Circle } from "lucide-react";
import { clsx } from "clsx";
import { useTabStore } from "../tab.store";


// ── Context menu ──────────────────────────────────────────────────────────────

interface ContextMenu { tabId: string; x: number; y: number; }

function TabContextMenu({ menu, onClose }: { menu: ContextMenu; onClose: () => void }) {
  const { closeTab, closeOtherTabs, closeTabsToRight, tabs } = useTabStore();
  const tab = tabs.find((t) => t.id === menu.tabId);
  if (!tab) return null;

  const item = (label: string, action: () => void, danger = false) => (
    <button key={label} onClick={() => { action(); onClose(); }}
      className={clsx("w-full text-left px-3 py-1.5 text-xs font-sans rounded-sm transition-colors",
        danger ? "text-danger hover:bg-danger/10" : "text-ink/80 hover:bg-raised hover:text-ink")}>
      {label}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div style={{ left: menu.x, top: menu.y }}
        className="fixed z-50 min-w-[160px] bg-overlay border border-border rounded-md shadow-2xl p-1 animate-fade-in">
        {tab.closeable && item("Close Tab",        () => closeTab(menu.tabId))}
        {item("Close Other Tabs",                  () => closeOtherTabs(menu.tabId))}
        {item("Close Tabs to Right",               () => closeTabsToRight(menu.tabId))}
      </div>
    </>
  );
}

// ── TabBar with pointer-based drag reorder ────────────────────────────────────

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, reorderTabs } = useTabStore();
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // Drag state
  const dragging    = useRef<number | null>(null);  // index being dragged
  const [dropIdx,   setDropIdx]   = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const tabRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const scrollRef   = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = idx;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging.current === null) return;
    if (!isDragging) setIsDragging(true);

    // Find which tab the pointer is over by checking bounding rects
    const x = e.clientX;
    let newIdx = dragging.current;
    tabRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x < rect.right) newIdx = i;
    });
    setDropIdx(newIdx);
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent, idx: number) => {
    if (dragging.current === null) return;
    const from = dragging.current;

    if (!isDragging) {
      // It was a click — activate the tab
      setActiveTab(tabs[idx].id);
    } else if (dropIdx !== null && dropIdx !== from) {
      reorderTabs(from, dropIdx);
    }

    dragging.current = null;
    setDropIdx(null);
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, [isDragging, dropIdx, tabs, setActiveTab, reorderTabs]);

  const handleContextMenu = useCallback((e: MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY;
  }, []);

  // Keep tabRefs in sync with tab count
  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, tabs.length);
  }, [tabs.length]);

  return (
    <>
      <div className="flex h-9 bg-base border-b border-border shrink-0 overflow-hidden">
        <div ref={scrollRef} onWheel={handleWheel}
          className="flex overflow-x-auto overflow-y-hidden scrollbar-none"
          style={{ scrollbarWidth: "none" }}>

          {tabs.map((tab, idx) => {
            const isActive  = tab.id === activeTabId;
            const isDropTarget = dropIdx === idx && dragging.current !== null && dragging.current !== idx;
            const Icon = tab.icon;

            return (
              <div
                key={tab.id}
                ref={(el) => { tabRefs.current[idx] = el; }}
                onPointerDown={(e) => handlePointerDown(e, idx)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUp(e, idx)}
                onContextMenu={(e) => handleContextMenu(e, tab.id)}
                className={clsx(
                  "group relative flex items-center gap-1.5 h-full px-3",
                  "text-2xs font-sans font-medium border-r border-border",
                  "transition-colors duration-100 select-none shrink-0",
                  "max-w-[180px] min-w-[80px]",
                  isDragging && dragging.current === idx ? "opacity-50 cursor-grabbing" : "cursor-pointer",
                  isDropTarget ? "bg-raised border-l-2 border-l-amber" : "",
                  !isDropTarget && isActive  ? "bg-surface text-ink" : "",
                  !isDropTarget && !isActive ? "bg-base text-muted hover:bg-surface/60 hover:text-ink/70" : "",
                )}
                title={tab.title}
              >
                {isActive && !isDropTarget && (
                  <span className="absolute top-0 left-0 right-0 h-[2px] bg-amber" />
                )}
                {Icon && <Icon size={11} className="shrink-0 opacity-70" />}
                <span className="truncate flex-1 text-left leading-none pointer-events-none">
                  {tab.title}
                </span>
                {tab.dirty && !isActive ? (
                  <Circle size={6} className="shrink-0 fill-amber text-amber" />
                ) : tab.closeable ? (
                  <span
                    role="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
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
              </div>
            );
          })}
        </div>
        <div className="flex-1 min-w-4" />
      </div>

      {contextMenu && (
        <TabContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
      )}
    </>
  );
}