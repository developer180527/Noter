import { useCallback, useRef, type MouseEvent } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Settings,
  Library,
  BookOpen,
  Hash,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { useSidebarStore, type SidebarNavItem } from "../sidebar.store";
import { useTabStore } from "@/features/tabs/tab.store";

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, Settings, Library, BookOpen, Hash, Inbox,
};

function NavIcon({ name, size = 14 }: { name: string; size?: number }) {
  const Icon: LucideIcon = ICON_MAP[name] ?? FileText;
  return <Icon size={size} />;
}

function NavItem({ item, collapsed }: { item: SidebarNavItem; collapsed: boolean }) {
  const { activeItemId, setActiveItem } = useSidebarStore();
  const { openTab } = useTabStore();
  const isActive = activeItemId === item.id;

  const handleClick = () => {
    setActiveItem(item.id);
    openTab({
      id:        `page-${item.componentKey}`,
      title:     item.label,
      component: () => null,
      props:     { _componentKey: item.componentKey },
      closeable: true,
      pinned:    false,
    });
  };

  return (
    <button
      onClick={handleClick}
      title={collapsed ? item.label : undefined}
      className={clsx(
        "group relative flex items-center gap-2.5 w-full rounded-md transition-all duration-100 text-left select-none",
        collapsed ? "justify-center px-0 py-3" : "px-2.5 py-1.5",
        isActive
          ? "bg-amber/10 text-amber"
          : "text-muted hover:bg-raised hover:text-ink"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber rounded-full" />
      )}
      <span className={clsx("shrink-0", isActive ? "text-amber" : "")}>
        <NavIcon name={item.icon} size={collapsed ? 20 : 14} />
      </span>
      {!collapsed && (
        <span className="text-xs font-sans font-semibold truncate flex-1">{item.label}</span>
      )}
      {!collapsed && item.badge != null && item.badge > 0 && (
        <span className="shrink-0 bg-amber/20 text-amber text-2xs font-mono rounded-full px-1.5 py-0.5 leading-none">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </button>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="h-px bg-border mx-2 my-1" />;
  return (
    <p className="text-2xs font-mono uppercase tracking-widest text-subtle px-2.5 pt-3 pb-1 select-none">
      {label}
    </p>
  );
}

function ResizeHandle() {
  const { setWidth, width } = useSidebarStore();
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      startX.current = e.clientX;
      startW.current = width;
      const onMove = (mv: globalThis.MouseEvent) => {
        setWidth(startW.current + mv.clientX - startX.current);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [width, setWidth]
  );

  return (
    <div
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-amber/30 transition-colors group"
    >
      <div className="absolute right-0 top-0 bottom-0 w-px bg-border group-hover:bg-amber/40 transition-colors" />
    </div>
  );
}

function ToggleBtn({ collapsed, toggle }: { collapsed: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded text-muted hover:text-ink hover:bg-raised transition-colors shrink-0"
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={13} />}
    </button>
  );
}

export function Sidebar() {
  const { collapsed, toggle, width, items } = useSidebarStore();

  const sections = items.reduce<Record<string, SidebarNavItem[]>>((acc, item) => {
    const key = item.section ?? "__root";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <aside
      style={{ width: collapsed ? 80 : width }}
      className={clsx(
        "relative flex flex-col bg-surface border-r border-border",
        "transition-[width] duration-200 ease-out shrink-0 overflow-hidden"
      )}
    >
      {collapsed ? (
        <>
          <div
            className="h-9 shrink-0 border-b border-border"
            data-tauri-drag-region
          />
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <ToggleBtn collapsed={collapsed} toggle={toggle} />
          </div>
        </>
      ) : (
        <div
          className="h-9 shrink-0 border-b border-border flex items-center pl-[68px] pr-2"
          data-tauri-drag-region
        >
          <div className="flex-1" data-tauri-drag-region />
          <ToggleBtn collapsed={collapsed} toggle={toggle} />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {Object.entries(sections).map(([section, sectionItems]) => (
          <div key={section}>
            {section !== "__root" && (
              <SectionLabel label={section} collapsed={collapsed} />
            )}
            <div className="space-y-0.5">
              {(sectionItems as SidebarNavItem[]).map((item) => (
                <NavItem key={item.id} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && <ResizeHandle />}
    </aside>
  );
}