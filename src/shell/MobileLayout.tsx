import { useState, useEffect } from "react";
import { FileText, Library, Settings, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { useKernel } from "@/core";

interface MobileNavItem {
  id:           string;
  label:        string;
  icon:         LucideIcon;
  componentKey: string;
}

const NAV_ITEMS: MobileNavItem[] = [
  { id: "notes",    label: "Notes",    icon: FileText, componentKey: "notes-page"    },
  { id: "library",  label: "Library",  icon: Library,  componentKey: "library-page"  },
  { id: "settings", label: "Settings", icon: Settings,  componentKey: "settings-page" },
];

export function MobileLayout() {
  const [activeView, setActiveView] = useState("notes");
  const kernel = useKernel();
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = kernel.events.on("kernel:slot:registered", () =>
      setTick((t) => t + 1)
    );
    return unsub;
  }, [kernel]);

  const activeItem = NAV_ITEMS.find((i) => i.id === activeView) ?? NAV_ITEMS[0];
  // Resolve component via kernel slots — same as desktop TabContent
  const View = kernel.slots.get(`page:${activeItem.componentKey}`) as
    React.ComponentType<{ tabId: string }> | undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-base text-ink">
      <div className="flex-1 overflow-hidden">
        {View
          ? <View tabId={`mobile-${activeView}`} />
          : (
            <div className="flex-1 flex items-center justify-center h-full">
              <p className="text-subtle text-xs font-mono">Loading…</p>
            </div>
          )
        }
      </div>

      <nav className="flex h-14 bg-surface border-t border-border shrink-0">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
            >
              <Icon size={18} className={clsx("transition-colors", isActive ? "text-amber" : "text-subtle")} />
              <span className={clsx("text-2xs font-sans transition-colors", isActive ? "text-amber" : "text-subtle")}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
