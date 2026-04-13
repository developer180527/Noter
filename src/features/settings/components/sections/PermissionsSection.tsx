import { ShieldCheck, ShieldAlert, Info } from "lucide-react";
import { SectionHeader, SettingGroup, SettingRow, Toggle } from "./shared";
import { useSettingsStore } from "../../settings.store";

function PermissionNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 px-4 py-3 bg-amber/5 border border-amber/15 rounded-lg mb-6">
      <Info size={13} className="text-amber shrink-0 mt-0.5" />
      <p className="text-2xs font-sans text-subtle leading-relaxed">{children}</p>
    </div>
  );
}

export function PermissionsSection() {
  const s = useSettingsStore();

  return (
    <div>
      <SectionHeader
        title="Permissions"
        description="Control what noter is allowed to do on your device."
      />

      <PermissionNote>
        noter is a local-first app. Your notes never leave your device unless you
        explicitly export them. These toggles control optional system integrations.
      </PermissionNote>

      <SettingGroup title="Connectivity">
        <SettingRow
          label="Automatic updates"
          description="Check for new versions of noter on launch and install them in the background."
        >
          <Toggle value={s.permAutoUpdate} onChange={(v) => s.set("permAutoUpdate", v)} />
        </SettingRow>
        <SettingRow
          label="Crash reports"
          description="Send anonymous crash reports to help fix bugs. No note content is ever included."
        >
          <Toggle value={s.permCrashReports} onChange={(v) => s.set("permCrashReports", v)} />
        </SettingRow>
        <SettingRow
          label="Usage analytics"
          description="Share anonymous usage data (which features you use) to guide development."
        >
          <Toggle value={s.permAnalytics} onChange={(v) => s.set("permAnalytics", v)} />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Device">
        <SettingRow
          label="File system access"
          description="Required for saving and loading notes from disk. noter cannot function without this."
        >
          <Toggle value={s.permFileAccess} onChange={(v) => s.set("permFileAccess", v)} disabled />
        </SettingRow>
        <SettingRow
          label="Clipboard monitoring"
          description="Watch the clipboard for content to paste as notes. Used by the clipboard history plugin."
        >
          <Toggle value={s.permClipboard} onChange={(v) => s.set("permClipboard", v)} />
        </SettingRow>
        <SettingRow
          label="System notifications"
          description="Show system notifications for reminders and background sync status."
        >
          <Toggle value={s.permNotifications} onChange={(v) => s.set("permNotifications", v)} />
        </SettingRow>
      </SettingGroup>

      {/* Permission summary */}
      <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-raised/30">
          <ShieldCheck size={13} className="text-success" />
          <p className="text-xs font-sans text-ink/70">
            noter does not collect, sell, or share your notes or personal data.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-raised/30">
          <ShieldAlert size={13} className="text-subtle" />
          <p className="text-xs font-sans text-ink/70">
            All data is stored locally. Sync and cloud features are opt-in future additions.
          </p>
        </div>
      </div>
    </div>
  );
}
