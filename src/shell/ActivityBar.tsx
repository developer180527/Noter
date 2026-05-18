// ─────────────────────────────────────────────────────────────────────────────
// ActivityBar
// Supports:
//   - Position: left (default) | right | bottom — read from activityBar.store
//   - Drag-to-reorder items (pointer capture, no external library)
//   - macOS dock-style magnification on hover (cosine curve, spring easing)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  FileText, Library, Settings, BookOpen, Hash, Inbox, PenLine,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { useSidebarStore, type SidebarNavItem } from "@/features/sidebar/sidebar.store";
import { useTabStore }          from "@/features/tabs/tab.store";
import { useActivityBarStore }  from "./ActivityBar.store";

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, Library, Settings, BookOpen, Hash, Inbox, PenLine,
};

// ── Magnification constants ───────────────────────────────────────────────────

const BASE   = 58;   // px — normal item height (matches original py-4 + icon + label)
const PEAK   = 76;   // px — maximum size at cursor
const RADIUS = 90;   // px — spread distance

function magnifiedSize(itemCenter: number, cursor: number): number {
  const dist = Math.abs(cursor - itemCenter);
  if (dist >= RADIUS) return BASE;
  const t = dist / RADIUS;
  return BASE + (PEAK - BASE) * Math.cos((t * Math.PI) / 2);
}

// ── ActivityItem ──────────────────────────────────────────────────────────────

interface ActivityItemProps {
  item:        SidebarNavItem;
  tabMap:      Map<string, { id: string }>;
  activeTabId: string | null;
  activePanel: string | null;
  // Layout
  isBottom:    boolean;
  isRight:     boolean;
  // Magnification
  itemSize:    number;         // computed px height (or width for bottom)
  isDragging:  boolean;
  isDropTarget: boolean;
  // Drag events
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp:   (e: React.PointerEvent) => void;
  // Ref callback
  itemRef: (el: HTMLDivElement | null) => void;
}

function ActivityItem({
  item, tabMap, activeTabId, activePanel,
  isBottom, isRight, itemSize, isDragging, isDropTarget,
  onPointerDown, onPointerMove, onPointerUp, itemRef,
}: ActivityItemProps) {
  const { setActivePanel } = useSidebarStore();
  const { openTab, setActiveTab } = useTabStore();
  const Icon = ICON_MAP[item.icon] ?? FileText;

  const tabId = item.isPanelItem
    ? (item.linkedTabId ?? "")
    : `page-${item.componentKey}`;

  const isActive = item.isPanelItem
    ? activePanel === item.id && activeTabId === tabId
    : activeTabId === tabId;

  const handleClick = (e: React.MouseEvent) => {
    // Suppress click if we just finished dragging
    if ((e.currentTarget as any).__wasDragging) return;

    if (item.isPanelItem) {
      setActivePanel(item.id);
      if (tabMap.has(tabId)) {
        setActiveTab(tabId);
      } else if (tabId) {
        openTab({
          id:        tabId,
          title:     item.label,
          component: () => null,
          props:     { _componentKey: item.componentKey },
          closeable: true,
          pinned:    false,
        });
      }
    } else {
      setActivePanel(null);
      if (tabMap.has(tabId)) {
        setActiveTab(tabId);
      } else {
        openTab({
          id:        tabId,
          title:     item.label,
          component: () => null,
          props:     { _componentKey: item.componentKey },
          closeable: true,
          pinned:    false,
        });
      }
    }
  };

  // Active indicator position depends on bar position
  const indicatorStyle: React.CSSProperties = isBottom
    ? { bottom: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 3, borderRadius: "3px 3px 0 0" }
    : isRight
      ? { right: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, borderRadius: "3px 0 0 3px" }
      : { left:  0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, borderRadius: "0 3px 3px 0" };

  // For bottom bar: control width, keep height fluid
  // For side bars:  control height, keep width = 100%
  const sizeStyle: React.CSSProperties = isBottom
    ? { width: itemSize, flexShrink: 0, transition: isDragging ? "none" : "width 80ms cubic-bezier(0.34,1.56,0.64,1)" }
    : { height: itemSize, transition: isDragging ? "none" : "height 80ms cubic-bezier(0.34,1.56,0.64,1)" };

  return (
    <div
      ref={itemRef}
      style={{
        ...sizeStyle,
        opacity:       isDragging  ? 0.35 : 1,
        outline:       isDropTarget ? "2px solid rgba(212,144,58,0.7)" : "none",
        outlineOffset: "2px",
        borderRadius:  8,
        cursor:        "pointer",
        touchAction:   "none",
        userSelect:    "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={handleClick}
    >
      <button
        title={item.label}
        tabIndex={-1}          // parent div handles focus
        className={clsx(
          "relative flex flex-col items-center justify-center w-full h-full gap-1.5 py-2 transition-colors rounded-lg",
          isActive ? "text-ink" : "text-muted hover:text-ink/70"
        )}
        style={{ pointerEvents: "none" }}  // let parent div handle events
      >
        {isActive && (
          <span className="absolute bg-amber rounded-r-full" style={indicatorStyle} />
        )}
        <Icon size={22} strokeWidth={isActive ? 2 : 1.75} />
        <span className={clsx(
          "text-[9px] font-mono tracking-wide leading-none",
          isActive ? "text-ink/70" : "text-muted/60"
        )}>
          {item.label}
        </span>
        {item.badge != null && item.badge > 0 && (
          <span className="absolute top-2 right-2.5 bg-amber text-base text-2xs
                           font-mono rounded-full w-3.5 h-3.5 flex items-center justify-center">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        )}
      </button>
    </div>
  );
}

// ── ActivityBar ───────────────────────────────────────────────────────────────

export function ActivityBar() {
  const { items, activePanel, setActivePanel } = useSidebarStore();
  const { tabs, activeTabId }                  = useTabStore();
  const position  = useActivityBarStore((s) => s.position);
  const order     = useActivityBarStore((s) => s.order);
  const setOrder  = useActivityBarStore((s) => s.setOrder);
  const magnification = useActivityBarStore((s) => s.magnification);

  const isBottom = position === "bottom";
  const isRight  = position === "right";

  // O(1) tab lookup
  const tabMap = useMemo(() => new Map(tabs.map((t) => [t.id, t])), [tabs]);

  // Sync activePanel when tab bar is clicked directly
  useEffect(() => {
    const panelItems  = items.filter((i) => i.isPanelItem);
    const linkedPanel = panelItems.find((i) => i.linkedTabId === activeTabId);
    if (linkedPanel) {
      if (activePanel !== linkedPanel.id) setActivePanel(linkedPanel.id);
    } else if (activePanel !== null) {
      setActivePanel(null);
    }
  }, [activeTabId]); // eslint-disable-line

  // ── Sorted items based on user order ────────────────────────────────────────

  const allItems     = items;
  const panelItems   = allItems.filter((i) =>  i.isPanelItem);
  const tabItems     = allItems.filter((i) => !i.isPanelItem);
  const settingsItem = tabItems.find((i) => i.id === "settings");
  const otherTab     = tabItems.filter((i) => i.id !== "settings");

  // Items available for reordering (everything except settings which is pinned)
  const reorderableItems = [...panelItems, ...otherTab];

  const sortedReorderable = order.length > 0
    ? [...reorderableItems].sort((a, b) => {
        const ai = order.indexOf(a.id);
        const bi = order.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : reorderableItems;

  // Sync new items into order store
  useEffect(() => {
    const ids    = reorderableItems.map((i) => i.id);
    const newIds = ids.filter((id) => !order.includes(id));
    if (newIds.length > 0) setOrder([...order, ...newIds]);
  }, [reorderableItems.map((i) => i.id).join(",")]); // eslint-disable-line

  // ── Magnification state ─────────────────────────────────────────────────────

  const [cursor, setCursor]   = useState<number | null>(null);
  const barRef                = useRef<HTMLDivElement>(null);
  const itemEls               = useRef<Map<string, HTMLDivElement>>(new Map());

  const onBarMouseMove = useCallback((e: React.MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    setCursor(isBottom ? e.clientX - rect.left : e.clientY - rect.top);
  }, [isBottom]);

  const onBarMouseLeave = useCallback(() => setCursor(null), []);

  const getItemSize = (id: string): number => {
    if (!magnification || cursor === null || draggingId !== null) return BASE;
    const el   = itemEls.current.get(id);
    if (!el || !barRef.current) return BASE;
    const barRect  = barRef.current.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();
    const center   = isBottom
      ? itemRect.left - barRect.left + itemRect.width  / 2
      : itemRect.top  - barRect.top  + itemRect.height / 2;
    return magnifiedSize(center, cursor);
  };

  // ── Drag-to-reorder ─────────────────────────────────────────────────────────

  const [draggingId,  setDraggingId]  = useState<string | null>(null);
  const [dropIndex,   setDropIndex]   = useState<number | null>(null);
  const dragStartIdx                  = useRef<number>(-1);
  const dragMoved                     = useRef(false);
  const DRAG_THRESHOLD                = 6; // px before drag starts
  const pointerStart                  = useRef<{ x: number; y: number } | null>(null);

  const startDrag = useCallback((id: string, idx: number, e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerStart.current  = { x: e.clientX, y: e.clientY };
    dragMoved.current     = false;
    dragStartIdx.current  = idx;
    // Don't set draggingId yet — wait for threshold
    (e.currentTarget as any).__pendingDragId  = id;
    (e.currentTarget as any).__pendingDragIdx = idx;
  }, []);

  const moveDrag = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as any;

    // Check threshold
    if (!dragMoved.current && pointerStart.current) {
      const dx = e.clientX - pointerStart.current.x;
      const dy = e.clientY - pointerStart.current.y;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      dragMoved.current = true;
      setDraggingId(el.__pendingDragId ?? null);
    }

    if (!dragMoved.current || !draggingId) return;

    // Find closest drop slot
    let closest = 0, closestDist = Infinity;
    sortedReorderable.forEach((item, i) => {
      const ref  = itemEls.current.get(item.id);
      if (!ref) return;
      const rect = ref.getBoundingClientRect();
      const center = isBottom
        ? rect.left + rect.width  / 2
        : rect.top  + rect.height / 2;
      const dist = Math.abs((isBottom ? e.clientX : e.clientY) - center);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    setDropIndex(closest);
  }, [draggingId, isBottom, sortedReorderable]);

  const endDrag = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as any;
    if (dragMoved.current && draggingId !== null && dropIndex !== null) {
      const from = dragStartIdx.current;
      const to   = dropIndex;
      if (from !== to) {
        const ids = sortedReorderable.map((i) => i.id);
        const [moved] = ids.splice(from, 1);
        ids.splice(to, 0, moved);
        setOrder(ids);
      }
      // Mark as dragged so click handler ignores this pointer up
      el.__wasDragging = true;
      setTimeout(() => { el.__wasDragging = false; }, 0);
    }
    setDraggingId(null);
    setDropIndex(null);
    dragMoved.current    = false;
    pointerStart.current = null;
  }, [draggingId, dropIndex, sortedReorderable, setOrder]);

  // ── Bar layout classes ───────────────────────────────────────────────────────

  const barClass = clsx(
    "flex shrink-0 bg-base select-none",
    isBottom
      ? "flex-row items-stretch border-t border-border w-full px-1"
      : "flex-col items-stretch border-border",
    !isBottom && "h-full",
    position === "left"  && "border-r",
    position === "right" && "border-l",
  );

  const barStyle: React.CSSProperties = isBottom
    ? { height: 72 }
    : { width: 64 };

  const itemCommonProps = { tabMap, activeTabId, activePanel, isBottom, isRight };

  return (
    <div
      ref={barRef}
      className={barClass}
      style={barStyle}
      onMouseMove={onBarMouseMove}
      onMouseLeave={onBarMouseLeave}
    >
      {/* Reorderable items */}
      <div className={clsx(
        "flex flex-1",
        isBottom ? "flex-row items-stretch gap-0" : "flex-col items-stretch pt-1"
      )}>
        {sortedReorderable.map((item, idx) => (
          <ActivityItem
            key={item.id}
            item={item}
            {...itemCommonProps}
            itemSize={getItemSize(item.id)}
            isDragging={draggingId === item.id}
            isDropTarget={dropIndex === idx && draggingId !== null && draggingId !== item.id}
            itemRef={(el) => { if (el) itemEls.current.set(item.id, el); else itemEls.current.delete(item.id); }}
            onPointerDown={(e) => startDrag(item.id, idx, e)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
          />
        ))}
      </div>

      {/* Settings — always pinned to end */}
      {settingsItem && (
        <div className={clsx(
          "flex shrink-0",
          isBottom ? "items-stretch border-l border-border" : "flex-col border-t border-border pb-1"
        )}>
          <ActivityItem
            key={settingsItem.id}
            item={settingsItem}
            {...itemCommonProps}
            itemSize={BASE}
            isDragging={false}
            isDropTarget={false}
            itemRef={(el) => { if (el) itemEls.current.set(settingsItem.id, el); else itemEls.current.delete(settingsItem.id); }}
            onPointerDown={() => {}}
            onPointerMove={() => {}}
            onPointerUp={() => {}}
          />
        </div>
      )}
    </div>
  );
}

export { useActivityBarStore };
