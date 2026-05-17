// src/features/notes/components/NoteLinkPicker.tsx
// Standalone version — receives editor directly as a prop.
// Used by TipTapEditor which passes its editor instance in.
import { useState, useEffect, useRef } from "react";
import type { Editor }  from "@tiptap/core";
import { useNoteStore } from "@/features/notes/note.store";

interface PickerPos { top: number; left: number; insertPos: number; }

interface NoteLinkPickerProps {
  editor:   Editor;
  position: PickerPos;
  onClose:  () => void;
}

export function NoteLinkPicker({ editor, position, onClose }: NoteLinkPickerProps) {
  const [query,   setQuery]   = useState("");
  const [focused, setFocused] = useState(0);
  const inputRef              = useRef<HTMLInputElement>(null);

  const notes = useNoteStore((s: any) => (s.notes ?? []) as any[]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = notes
    .filter((n: any) =>
      !n.archived &&
      (n.title || "Untitled").toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  const insert = (note: any) => {
    editor
      .chain()
      .focus()
      .insertContentAt(position.insertPos, {
        type:  "noteLink",
        attrs: { noteId: note.id, noteTitle: note.title || "Untitled" },
      })
      .run();
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused((f) => Math.min(f + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocused((f) => Math.max(f - 1, 0)); }
    if (e.key === "Enter")     { if (filtered[focused]) insert(filtered[focused]); }
    if (e.key === "Escape")    { onClose(); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-72 rounded-xl overflow-hidden shadow-2xl"
        style={{
          top:            position.top,
          left:           Math.min(position.left, window.innerWidth - 300),
          background:     "rgba(10,10,10,0.96)",
          backdropFilter: "blur(32px) saturate(1.8)",
          border:         "1px solid rgba(255,255,255,0.10)",
          boxShadow:      "0 0 0 1px rgba(212,144,58,0.25), 0 24px 64px rgba(0,0,0,0.7)",
        }}
      >
        {/* Amber top rim */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(212,144,58,0.7),transparent)" }}
        />

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="font-mono text-xs" style={{ color: "rgba(212,144,58,0.6)" }}>
            {">>"}
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFocused(0); }}
            onKeyDown={onKey}
            placeholder="Link a note…"
            className="flex-1 bg-transparent text-xs font-sans outline-none"
            style={{ color: "#e8e0d5" }}
          />
          <span className="text-2xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
            ESC cancel
          </span>
        </div>

        {/* Results */}
        <div className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
              No notes found
            </p>
          ) : (
            filtered.map((note: any, i: number) => (
              <button
                key={note.id}
                onClick={() => insert(note)}
                onMouseEnter={() => setFocused(i)}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2 text-xs font-sans transition-colors"
                style={{
                  background: i === focused ? "rgba(212,144,58,0.10)" : "transparent",
                  color:      i === focused ? "#e8e0d5" : "rgba(255,255,255,0.55)",
                }}
              >
                <span style={{ color: "rgba(212,144,58,0.5)", fontFamily: "monospace" }}>[[</span>
                <span className="flex-1 truncate">{note.title || "Untitled"}</span>
                <span style={{ color: "rgba(212,144,58,0.5)", fontFamily: "monospace" }}>]]</span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}