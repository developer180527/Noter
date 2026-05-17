import { SectionHeader, SettingGroup, SettingRow, Toggle } from "./shared";
import { useSettingsStore }    from "../../settings.store";
import { useActivityBarStore } from "@/shell/activityBar.store";
import type { ActivityBarPosition } from "@/shell/activityBar.store";
import { PanelLeft, PanelRight, PanelBottom } from "lucide-react";
import { clsx } from "clsx";

const FONT_PREVIEW = "The quick brown fox jumps over the lazy dog.";

export function AppearanceSection() {
  const s               = useSettingsStore();
  const position        = useActivityBarStore((st) => st.position);
  const setPosition     = useActivityBarStore((st) => st.setPosition);
  const resetOrder      = useActivityBarStore((st) => st.resetOrder);
  const magnification   = useActivityBarStore((st) => st.magnification);
  const setMagnification = useActivityBarStore((st) => st.setMagnification);

  const positionOptions: { value: ActivityBarPosition; label: string; Icon: typeof PanelLeft }[] = [
    { value: "left",   label: "Left",   Icon: PanelLeft   },
    { value: "right",  label: "Right",  Icon: PanelRight  },
    { value: "bottom", label: "Bottom", Icon: PanelBottom },
  ];

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

      <SettingGroup title="Activity Bar">
        <SettingRow
          label="Position"
          description="Where the activity bar appears in the window."
        >
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-raised border border-border">
            {positionOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setPosition(value)}
                title={label}
                className={clsx(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono",
                  "transition-colors duration-100",
                  position === value
                    ? "bg-amber/15 text-amber"
                    : "text-subtle hover:text-ink"
                )}
              >
                <Icon size={12} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow
          label="Icon magnification"
          description="Magnify icons when hovering, like the macOS dock."
        >
          <Toggle value={magnification} onChange={setMagnification} />
        </SettingRow>

        <SettingRow
          label="Item order"
          description="Drag items in the activity bar to reorder them."
        >
          <button
            onClick={resetOrder}
            className="text-xs font-mono text-subtle hover:text-ink transition-colors"
          >
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