// src/features/settings/components/sections/AppearanceSection.tsx
import { SectionHeader, SettingGroup, SettingRow, Toggle } from "./shared";
import { useSettingsStore }    from "../../settings.store";
import { useThemeStore }       from "../../theme.store";
import { useActivityBarStore } from "@/shell/ActivityBar";
import type { ActivityBarPosition } from "@/shell/ActivityBar.store";
import { THEMES }              from "../../themes";
import { PanelLeft, PanelRight, PanelBottom, Check } from "lucide-react";
import { clsx }                from "clsx";

const FONT_PREVIEW = "The quick brown fox jumps over the lazy dog.";

function ThemeCard({ theme, active, onSelect }: {
  theme:    typeof THEMES[number];
  active:   boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      title={theme.description}
      className={clsx(
        "relative flex flex-col rounded-xl overflow-hidden border transition-all duration-150",
        "hover:scale-[1.03] hover:shadow-lg",
        active ? "ring-2 ring-amber border-amber/50" : "border-border hover:border-muted"
      )}
      style={{ background: theme.preview.base }}
    >
      {/* Mini UI preview */}
      <div className="p-2.5 space-y-1.5">
        <div className="flex gap-1.5 items-start">
          <div className="flex flex-col gap-1 shrink-0" style={{ width: 8 }}>
            {[0,1,2].map((i) => (
              <div key={i} className="rounded-sm"
                style={{ width: 8, height: 8, background: i === 0 ? theme.preview.accent : theme.preview.surface }} />
            ))}
          </div>
          <div className="flex-1 space-y-1">
            <div className="rounded" style={{ height: 5, width: "70%", background: theme.preview.ink, opacity: 0.9 }} />
            <div className="rounded" style={{ height: 3, width: "90%", background: theme.preview.ink, opacity: 0.4 }} />
            <div className="rounded" style={{ height: 3, width: "60%", background: theme.preview.ink, opacity: 0.4 }} />
            <div className="rounded mt-1.5" style={{ height: 3, width: "80%", background: theme.preview.accent, opacity: 0.6 }} />
          </div>
        </div>
        <div className="flex gap-1 pt-0.5" style={{ borderTop: `1px solid ${theme.preview.border}` }}>
          <div className="rounded-sm px-1.5 py-0.5"
            style={{ background: theme.preview.surface, color: theme.preview.ink, opacity: 0.7, fontFamily: "monospace", fontSize: 5 }}>
            Notes
          </div>
          <div className="rounded-sm px-1.5 py-0.5"
            style={{ background: theme.preview.accent + "30", color: theme.preview.accent, fontFamily: "monospace", fontSize: 5 }}>
            Canvas
          </div>
        </div>
      </div>
      {/* Name */}
      <div className="px-2.5 pb-2 pt-0.5">
        <p className="text-[10px] font-mono truncate" style={{ color: theme.preview.ink }}>{theme.name}</p>
        <p className="text-[8px] truncate mt-0.5" style={{ color: theme.preview.ink, opacity: 0.5 }}>{theme.description}</p>
      </div>
      {/* Checkmark */}
      {active && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber flex items-center justify-center">
          <Check size={9} className="text-base" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

export function AppearanceSection() {
  const s             = useSettingsStore();
  const activeTheme   = useThemeStore((st) => st.activeTheme);
  const setTheme      = useThemeStore((st) => st.setTheme);
  const position      = useActivityBarStore((st) => st.position);
  const setPosition   = useActivityBarStore((st) => st.setPosition);
  const resetOrder    = useActivityBarStore((st) => st.resetOrder);
  const magnification = useActivityBarStore((st) => st.magnification);
  const setMag        = useActivityBarStore((st) => st.setMagnification);

  const positionOptions: { value: ActivityBarPosition; label: string; Icon: typeof PanelLeft }[] = [
    { value: "left",   label: "Left",   Icon: PanelLeft   },
    { value: "right",  label: "Right",  Icon: PanelRight  },
    { value: "bottom", label: "Bottom", Icon: PanelBottom },
  ];

  return (
    <div>
      <SectionHeader title="Appearance" description="Visual style and display preferences." />

      <SettingGroup title="Theme">
        <div className="px-4 py-3">
          <div className="grid grid-cols-4 gap-2.5">
            {THEMES.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                active={activeTheme === theme.id}
                onSelect={() => setTheme(theme.id)}
              />
            ))}
          </div>
        </div>
        <SettingRow label="Reduced motion" description="Disable animations and transitions.">
          <Toggle value={s.reducedMotion} onChange={(v) => s.set("reducedMotion", v)} />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Activity Bar">
        <SettingRow label="Position" description="Where the activity bar appears in the window.">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-raised border border-border">
            {positionOptions.map(({ value, label, Icon }) => (
              <button key={value} onClick={() => setPosition(value)}
                className={clsx("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors duration-100",
                  position === value ? "bg-amber/15 text-amber" : "text-subtle hover:text-ink")}>
                <Icon size={12} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Icon magnification" description="Magnify icons on hover like the macOS dock.">
          <Toggle value={magnification} onChange={setMag} />
        </SettingRow>
        <SettingRow label="Item order" description="Drag items in the activity bar to reorder them.">
          <button onClick={resetOrder} className="text-xs font-mono text-subtle hover:text-ink transition-colors">
            Reset to default
          </button>
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

      <div className="rounded-lg border border-border bg-raised/30 px-4 py-3">
        <p className="text-2xs font-mono uppercase tracking-widest text-subtle mb-2">Preview</p>
        <p className="font-serif text-ink/80 leading-relaxed" style={{ fontSize: s.editorFontSize }}>{FONT_PREVIEW}</p>
        <p className="font-sans text-xs text-muted mt-1">{FONT_PREVIEW}</p>
      </div>
    </div>
  );
}