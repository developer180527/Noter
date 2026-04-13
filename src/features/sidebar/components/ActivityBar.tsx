import { useEffect } from "react";
import { FileText, Library, Settings, BookOpen, Hash, Inbox, PenLine, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { useSidebarStore, type SidebarNavItem } from "../sidebar.store";
import { useTabStore } from "@/features/tabs/tab.store";

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, Library, Settings, BookOpen, Hash, Inbox, PenLine,
};

function ActivityItem({ item }: { item: SidebarNavItem }) {
  const { activePanel, setActivePanel } = useSidebarStore();
  const { openTab, setActiveTab, tabs, activeTabId } = useTabStore();
  const Icon = ICON_MAP[item.icon] ?? FileText;

  // For panel items, the linked tab ID comes from the item itself — no hardcoding
  const tabId = item.isPanelItem
    ? (item.linkedTabId ?? "")
    : `page-${item.componentKey}`;

  const isActive = item.isPanelItem
    ? activePanel === item.id && activeTabId === tabId
    : activeTabId === tabId;

  const handleClick = () => {
    if (item.isPanelItem) {
      setActivePanel(item.id);
      const existing = tabs.find((t) => t.id === tabId);
      if (existing) {
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
      const existing = tabs.find((t) => t.id === tabId);
      if (existing) {
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

export function ActivityBar() {
  const { items, activePanel, setActivePanel } = useSidebarStore();
  const { activeTabId } = useTabStore();

  // Sync activePanel when tabs change externally (user clicks tab bar directly)
  useEffect(() => {
    const panelItems = items.filter((i) => i.isPanelItem);
    const linkedPanel = panelItems.find((i) => i.linkedTabId === activeTabId);
    if (linkedPanel) {
      if (activePanel !== linkedPanel.id) setActivePanel(linkedPanel.id);
    } else if (activePanel !== null) {
      setActivePanel(null);
    }
  }, [activeTabId]); // eslint-disable-line

  const panelItems = items.filter((i) => i.isPanelItem);
  const tabItems   = items.filter((i) => !i.isPanelItem);

  return (
    <div className="flex flex-col bg-base border-r border-border shrink-0" style={{ width: 64 }}>
      <div className="flex flex-col flex-1 pt-1">
        {panelItems.map((item) => <ActivityItem key={item.id} item={item} />)}
      </div>
      <div className="flex flex-col pb-1 border-t border-border">
        {tabItems.map((item) => <ActivityItem key={item.id} item={item} />)}
      </div>
    </div>
  );
}
