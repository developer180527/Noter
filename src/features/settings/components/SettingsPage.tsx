import { useSettingsStore } from "../settings.store";
import { SettingsSidebar } from "./SettingsSidebar";
import { GeneralSection }    from "./sections/GeneralSection";
import { NotesSection }      from "./sections/NotesSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { PermissionsSection} from "./sections/PermissionsSection";
import { PluginsSection }    from "./sections/PluginsSection";
import { AboutSection }      from "./sections/AboutSection";
import type { TabComponentProps } from "@/features/tabs/types";

function ActiveSection() {
  const { activeSection } = useSettingsStore();
  switch (activeSection) {
    case "general":     return <GeneralSection />;
    case "notes":       return <NotesSection />;
    case "appearance":  return <AppearanceSection />;
    case "permissions": return <PermissionsSection />;
    case "plugins":     return <PluginsSection />;
    case "about":       return <AboutSection />;
    default:            return <GeneralSection />;
  }
}

export function SettingsPage(_props: TabComponentProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sub-sidebar — mirrors Notes page NoteList panel */}
      <SettingsSidebar />

      {/* Content panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <ActiveSection />
        </div>
      </div>
    </div>
  );
}