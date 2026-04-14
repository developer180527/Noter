// ─────────────────────────────────────────────────────────────────────────────
// ActivityBar
// Fixed left strip. Renders nav items from the sidebar store.
// Performance notes:
//   - tabMap: useMemo'd Map<id, Tab> — O(1) lookup instead of tabs.find() O(n)
//   - kernel.getComponent(key) resolves page components from the slot registry
//     instead of passing `component: () => null` placeholders
// Layout order (registration order in sidebar store controls this):
//   top section  → panel items (Notes, Canvas, Library)
//   bottom section → tab items (Settings)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo } from "react";
import {
  FileText, Library, Settings, BookOpen, Hash, Inbox, PenLine,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { useSidebarStore, type SidebarNavItem } from "../sidebar.store";
import { useTabStore } from "@/features/tabs/tab.store";

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, Library, Settings, BookOpen, Hash, Inbox, PenLine,
};

// ── ActivityItem ──────────────────────────────────────────────────────────────

interface ActivityItemProps {
  item:        SidebarNavItem;
  tabMap:      Map<string, { id: string }>;
  activeTabId: string | null;
  activePanel: string | null;
}

function ActivityItem({ item, tabMap, activeTabId, activePanel }: ActivityItemProps) {
  const { setActivePanel } = useSidebarStore();
  const { openTab, setActiveTab } = useTabStore();
  const Icon = ICON_MAP[item.icon] ?? FileText;

  const tabId = item.isPanelItem
    ? (item.linkedTabId ?? "")
    : `page-${item.componentKey}`;

  const isActive = item.isPanelItem
    ? activePanel === item.id && activeTabId === tabId
    : activeTabId === tabId;

  const handleClick = () => {
    if (item.isPanelItem) {
      setActivePanel(item.id);
      if (tabMap.has(tabId)) {
        setActiveTab(tabId);
      } else if (tabId) {
        openTab({
          id:        tabId,
          title:     item.label,
          component: () => null,   // TabContent resolves via slots at render time
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
          component: () => null,   // TabContent resolves via slots at render time
          props:     { _componentKey: item.componentKey },
          closeable: true,
          pinned:    false,
        });
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      title={item.label}
      className={clsx(
        "relative flex flex-col items-center justify-center w-full gap-1.5 py-4 transition-colors",
        isActive ? "text-ink" : "text-muted hover:text-ink/70"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-7 bg-amber rounded-r-full" />
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
  );
}

// ── ActivityBar ───────────────────────────────────────────────────────────────

export function ActivityBar() {
  const { items, activePanel, setActivePanel } = useSidebarStore();
  const { tabs, activeTabId } = useTabStore();

  // O(1) tab lookup — rebuilt only when tabs array reference changes
  const tabMap = useMemo(
    () => new Map(tabs.map((t) => [t.id, t])),
    [tabs]
  );

  // Sync activePanel when user clicks the tab bar directly (not the activity bar)
  useEffect(() => {
    const panelItems  = items.filter((i) => i.isPanelItem);
    const linkedPanel = panelItems.find((i) => i.linkedTabId === activeTabId);
    if (linkedPanel) {
      if (activePanel !== linkedPanel.id) setActivePanel(linkedPanel.id);
    } else if (activePanel !== null) {
      setActivePanel(null);
    }
  }, [activeTabId]); // eslint-disable-line

  const panelItems = items.filter((i) =>  i.isPanelItem);
  const tabItems   = items.filter((i) => !i.isPanelItem);

  const itemProps = { tabMap, activeTabId, activePanel };

  return (
    <div className="flex flex-col bg-base border-r border-border shrink-0" style={{ width: 64 }}>
      {/* Top — panel + page items (Notes, Canvas, Library in registration order) */}
      <div className="flex flex-col flex-1 pt-1">
        {panelItems.map((item) => (
          <ActivityItem key={item.id} item={item} {...itemProps} />
        ))}
        {/* Non-settings tab items that are not settings go here too */}
        {tabItems
          .filter((i) => i.id !== "settings")
          .map((item) => (
            <ActivityItem key={item.id} item={item} {...itemProps} />
          ))
        }
      </div>

      {/* Bottom — Settings always pinned here */}
      <div className="flex flex-col pb-1 border-t border-border">
        {tabItems
          .filter((i) => i.id === "settings")
          .map((item) => (
            <ActivityItem key={item.id} item={item} {...itemProps} />
          ))
        }
      </div>
    </div>
  );
}