import { SectionHeader, SettingGroup, SettingRow, Toggle, Select } from "./shared";
import { useSettingsStore } from "../../settings.store";

export function NotesSection() {
  const s = useSettingsStore();

  return (
    <div>
      <SectionHeader title="Notes" description="Editor behaviour and note defaults." />

      <SettingGroup title="Editor">
        <SettingRow label="Spell check" description="Underline misspelled words while typing.">
          <Toggle value={s.spellCheck} onChange={(v) => s.set("spellCheck", v)} />
        </SettingRow>
        <SettingRow label="Font size" description="Body text size in the editor.">
          <Select
            value={s.editorFontSize}
            onChange={(v) => s.set("editorFontSize", v as number)}
            options={[
              { label: "13px", value: 13 },
              { label: "14px", value: 14 },
              { label: "15px", value: 15 },
              { label: "16px", value: 16 },
              { label: "18px", value: 18 },
              { label: "20px", value: 20 },
            ]}
          />
        </SettingRow>
        <SettingRow label="Line height" description="Spacing between lines of text.">
          <Select
            value={s.editorLineHeight}
            onChange={(v) => s.set("editorLineHeight", v as number)}
            options={[
              { label: "Compact (1.5)",   value: 1.5  },
              { label: "Normal (1.75)",   value: 1.75 },
              { label: "Relaxed (1.85)", value: 1.85 },
              { label: "Spacious (2.0)", value: 2.0  },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Saving">
        <SettingRow
          label="Auto-save delay"
          description="How long after you stop typing before the draft is flushed to the store."
        >
          <Select
            value={s.autoSaveDelay}
            onChange={(v) => s.set("autoSaveDelay", v as number)}
            options={[
              { label: "Instant",  value: 0    },
              { label: "300ms",    value: 300  },
              { label: "500ms",    value: 500  },
              { label: "800ms",    value: 800  },
              { label: "1.5s",     value: 1500 },
              { label: "3s",       value: 3000 },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="New Notes">
        <SettingRow label="Default title" description="Title pre-filled when creating a new note.">
          <input
            type="text"
            value={s.defaultNoteTitle}
            onChange={(e) => s.set("defaultNoteTitle", e.target.value)}
            placeholder="Untitled"
            className="text-xs font-mono text-ink bg-overlay border border-border rounded
                       px-2 py-1 outline-none focus:border-amber/50 transition-colors w-28"
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Data">
        <SettingRow
          label="Export all notes"
          description="Download every note as a ZIP of Markdown files."
        >
          <button className="text-xs font-mono text-amber hover:text-amber-glow transition-colors">
            Export →
          </button>
        </SettingRow>
        <SettingRow
          label="Clear all notes"
          description="Permanently delete every note. This cannot be undone."
        >
          <button
            onClick={() => {
              if (confirm("Delete ALL notes? This cannot be undone.")) {
                localStorage.removeItem("noter:notes-v2");
                window.location.reload();
              }
            }}
            className="text-xs font-mono text-danger hover:text-danger/80 transition-colors"
          >
            Clear data
          </button>
        </SettingRow>
      </SettingGroup>
    </div>
  );
}
