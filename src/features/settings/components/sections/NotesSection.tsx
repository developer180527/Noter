import { useState } from "react";
import { SectionHeader, SettingGroup, SettingRow, Toggle, Select } from "./shared";
import { useSettingsStore } from "../../settings.store";

function ClearDataRow() {
  const [step, setStep] = useState<"idle" | "confirm" | "typing">("idle");
  const [input, setInput] = useState("");

  const reset = () => { setStep("idle"); setInput(""); };

  const doDelete = () => {
    localStorage.removeItem("noter:notes-v2");
    localStorage.removeItem("noter:tabs-v1");
    window.location.reload();
  };

  if (step === "idle") {
    return (
      <SettingRow label="Clear all notes" description="After confirmation permanently delete every note. This cannot be undone.">
        <button
          onClick={() => setStep("confirm")}
          className="text-xs font-mono text-danger hover:text-danger/80 transition-colors"
        >
          Clear data
        </button>
      </SettingRow>
    );
  }

  if (step === "confirm") {
    return (
      <div className="px-4 py-3 bg-danger/5 border-l-2 border-danger space-y-2.5">
        <p className="text-xs font-sans text-ink/90 font-medium">Are you sure?</p>
        <p className="text-2xs font-sans text-subtle leading-relaxed">
          This will permanently delete <span className="text-ink font-medium">all your notes</span> and
          cannot be undone. Type{" "}
          <span className="font-mono text-danger">DELETE</span>{" "}
          below to confirm.
        </p>
        <input
          autoFocus
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setStep("typing"); }}
          placeholder="Type DELETE to confirm"
          className="w-full text-xs font-mono text-ink bg-overlay border border-border rounded
                     px-2 py-1.5 outline-none focus:border-danger/60 transition-colors"
        />
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="text-xs font-mono text-subtle hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // step === "typing"
  const ready = input.trim() === "DELETE";
  return (
    <div className="px-4 py-3 bg-danger/5 border-l-2 border-danger space-y-2.5">
      <p className="text-xs font-sans text-ink/90 font-medium">Are you sure?</p>
      <p className="text-2xs font-sans text-subtle leading-relaxed">
        This will permanently delete <span className="text-ink font-medium">all your notes</span> and
        cannot be undone. Type{" "}
        <span className="font-mono text-danger">DELETE</span>{" "}
        below to confirm.
      </p>
      <input
        autoFocus
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type DELETE to confirm"
        className={`w-full text-xs font-mono text-ink bg-overlay border rounded
                   px-2 py-1.5 outline-none transition-colors
                   ${ready ? "border-danger/60 text-danger" : "border-border"}`}
      />
      <div className="flex gap-2 items-center">
        <button
          onClick={doDelete}
          disabled={!ready}
          className={`text-xs font-mono px-3 py-1 rounded transition-colors
            ${ready
              ? "bg-danger text-white hover:bg-danger/80"
              : "bg-overlay text-subtle cursor-not-allowed"}`}
        >
          Delete everything
        </button>
        <button
          onClick={reset}
          className="text-xs font-mono text-subtle hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

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
              { label: "Compact (1.5)",  value: 1.5  },
              { label: "Normal (1.75)",  value: 1.75 },
              { label: "Relaxed (1.85)", value: 1.85 },
              { label: "Spacious (2.0)", value: 2.0  },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Saving">
        <SettingRow label="Auto-save delay" description="How long after you stop typing before the draft is flushed to the store.">
          <Select
            value={s.autoSaveDelay}
            onChange={(v) => s.set("autoSaveDelay", v as number)}
            options={[
              { label: "Instant", value: 0    },
              { label: "300ms",   value: 300  },
              { label: "500ms",   value: 500  },
              { label: "800ms",   value: 800  },
              { label: "1.5s",    value: 1500 },
              { label: "3s",      value: 3000 },
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
        <SettingRow label="Export all notes" description="Download every note as a ZIP of Markdown files.">
          <button className="text-xs font-mono text-amber hover:text-amber-glow transition-colors">
            Export →
          </button>
        </SettingRow>
        <ClearDataRow />
      </SettingGroup>
    </div>
  );
}