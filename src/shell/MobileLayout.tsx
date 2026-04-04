import { FileText, Library, Settings, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";

interface MobileNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: MobileNavItem[] = [
  { id: "notes",    label: "Notes",   icon: FileText  },
  { id: "library",  label: "Library", icon: Library   },
  { id: "settings", label: "Settings",icon: Settings  },
];

interface MobileNavProps {
  activeView: string;
  onNavigate: (id: string) => void;
}

export function MobileNav({ activeView, onNavigate }: MobileNavProps) {
  return (
    <nav className="flex h-14 bg-surface border-t border-border shrink-0">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = activeView === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
          >
            <Icon
              size={18}
              className={clsx(
                "transition-colors",
                isActive ? "text-amber" : "text-subtle"
              )}
            />
            <span
              className={clsx(
                "text-2xs font-sans transition-colors",
                isActive ? "text-amber" : "text-subtle"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Mobile view router ────────────────────────────────────────────────────────

import { useState } from "react";
import { NotesPage }    from "@/features/notes/components/NotesPage";
import { LibraryPage }  from "@/features/library/components/LibraryPage";
import { SettingsPage } from "@/features/settings/components/SettingsPage";

const MOBILE_VIEWS: Record<string, React.ComponentType<{ tabId: string }>> = {
  notes:    NotesPage,
  library:  LibraryPage,
  settings: SettingsPage,
};

export function MobileLayout() {
  const [activeView, setActiveView] = useState("notes");
  const View = MOBILE_VIEWS[activeView] ?? NotesPage;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <View tabId={`mobile-${activeView}`} />
      </div>
      <MobileNav activeView={activeView} onNavigate={setActiveView} />
    </div>
  );
}
