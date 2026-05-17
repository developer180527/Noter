// src/features/notes/components/FontPicker.tsx
import { useState, useRef } from "react";
import { Type } from "lucide-react";
import type { Editor } from "@tiptap/core";

const FONTS = [
  { label: "Sans",      value: "Inter, sans-serif",           preview: "Aa" },
  { label: "Serif",     value: "Lora, Georgia, serif",        preview: "Aa" },
  { label: "Mono",      value: "JetBrains Mono, monospace",   preview: "Aa" },
  { label: "Rounded",   value: "Nunito, sans-serif",          preview: "Aa" },
  { label: "Slab",      value: "Roboto Slab, serif",          preview: "Aa" },
  { label: "Default",   value: "",                            preview: "Aa" },
];

export function FontPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const btnRef          = useRef<HTMLButtonElement>(null);

  const current = FONTS.find(f =>
    f.value && editor.isActive("textStyle", { fontFamily: f.value })
  );

  const apply = (font: typeof FONTS[0]) => {
    if (font.value) {
      editor.chain().focus().setFontFamily(font.value).run();
    } else {
      editor.chain().focus().unsetFontFamily().run();
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs
                   font-mono transition-colors
                   ${open ? "bg-amber/15 text-amber" : "text-subtle hover:text-ink hover:bg-raised"}`}
        title="Font family"
      >
        <Type size={11} />
        <span className="hidden sm:inline">{current?.label ?? "Font"}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 w-40 rounded-xl
                          overflow-hidden shadow-xl"
            style={{
              background:     "rgba(14,14,14,0.95)",
              backdropFilter: "blur(24px)",
              border:         "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {FONTS.map(font => (
              <button
                key={font.label}
                onClick={() => apply(font)}
                className="w-full flex items-center justify-between px-3 py-2
                           text-xs hover:bg-raised/50 transition-colors"
              >
                <span
                  className="text-ink"
                  style={{ fontFamily: font.value || "inherit" }}
                >
                  {font.label}
                </span>
                <span
                  className="text-muted text-sm"
                  style={{ fontFamily: font.value || "inherit" }}
                >
                  {font.preview}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}