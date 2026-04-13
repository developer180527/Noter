import { clsx } from "clsx";
import {
  Settings, FileText, Palette, ShieldCheck, Info,
  type LucideIcon,
} from "lucide-react";
import { useSettingsStore, type SettingsSection } from "../settings.store";

interface NavItem {
  id:    SettingsSection;
  label: string;
  icon:  LucideIcon;
}

const NAV: NavItem[] = [
  { id: "general",     label: "General",     icon: Settings    },
  { id: "notes",       label: "Notes",       icon: FileText    },
  { id: "appearance",  label: "Appearance",  icon: Palette     },
  { id: "permissions", label: "Permissions", icon: ShieldCheck },
  { id: "about",       label: "About",       icon: Info        },
];

export function SettingsSidebar() {
  const { activeSection, setSection } = useSettingsStore();

  return (
    <div className="flex flex-col h-full bg-surface border-r border-border shrink-0 w-48">
      <div className="px-3 py-3 border-b border-border shrink-0">
        <p className="text-2xs font-mono uppercase tracking-widest text-subtle">Settings</p>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={clsx(
                "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                "border-l-2",
                active
                  ? "border-l-amber bg-raised text-ink"
                  : "border-l-transparent text-muted hover:text-ink hover:bg-raised/50"
              )}
            >
              <Icon size={14} strokeWidth={active ? 2 : 1.75} />
              <span className="text-xs font-sans">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
