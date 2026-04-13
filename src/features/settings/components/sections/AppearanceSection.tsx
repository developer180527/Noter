import { SectionHeader, SettingGroup, SettingRow, Toggle } from "./shared";
import { useSettingsStore } from "../../settings.store";

const FONT_PREVIEW = "The quick brown fox jumps over the lazy dog.";

export function AppearanceSection() {
  const s = useSettingsStore();

  return (
    <div>
      <SectionHeader title="Appearance" description="Visual style and display preferences." />

      <SettingGroup title="Theme">
        <SettingRow label="Color theme" description="Light mode is coming in a future update.">
          <span className="text-2xs font-mono text-muted px-2 py-1 bg-overlay rounded border border-border">
            Dark
          </span>
        </SettingRow>
        <SettingRow label="Reduced motion" description="Disable animations and transitions.">
          <Toggle value={s.reducedMotion} onChange={(v) => s.set("reducedMotion", v)} />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Typography">
        <SettingRow label="Editor font" description="Used in the note body.">
          <span className="text-xs font-serif text-muted">Crimson Pro</span>
        </SettingRow>
        <SettingRow label="UI font" description="Used in menus, labels and toolbars.">
          <span className="text-xs font-sans text-muted">Geist</span>
        </SettingRow>
        <SettingRow label="Mono font" description="Used in code blocks and timestamps.">
          <span className="text-xs font-mono text-muted">Geist Mono</span>
        </SettingRow>
      </SettingGroup>

      {/* Font preview */}
      <div className="rounded-lg border border-border bg-raised/30 px-4 py-3">
        <p className="text-2xs font-mono uppercase tracking-widest text-subtle mb-2">Preview</p>
        <p className="font-serif text-ink/80 leading-relaxed" style={{ fontSize: s.editorFontSize }}>
          {FONT_PREVIEW}
        </p>
        <p className="font-sans text-xs text-muted mt-1">
          {FONT_PREVIEW}
        </p>
      </div>
    </div>
  );
}
