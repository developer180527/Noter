// src/features/notes/components/BacklinksPanel.tsx
import { useState }      from "react";
import { useNoteStore }  from "@/features/notes/note.store";
import type { Note }     from "@/features/notes/types";

export function BacklinksPanel({ noteId }: { noteId: string }) {
  const [open, setOpen] = useState(false);

  const notes = useNoteStore((s) => s.notes);

  const backlinks = notes.filter((n) => {
    if (n.id === noteId || n.archived) return false;
    // TipTap stores noteLink attrs as JSON — search for this noteId in the content
    const json = JSON.stringify(n.content ?? n.body ?? "");
    return json.includes(`"noteId":"${noteId}"`);
  });

  if (backlinks.length === 0) return null;

  const openNote = (note: Note) => {
    // Dispatch global event — NotesPage / notes feature listens and opens the tab
    // with the correct component reference (only the notes feature knows it)
    window.dispatchEvent(
      new CustomEvent("noter:open-note", {
        detail: { noteId: note.id, title: note.title || "Untitled" },
      })
    );
  };

  return (
    <div className="px-4 py-3 border-t border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-2xs font-mono uppercase
                   tracking-widest text-subtle mb-2 hover:text-ink transition-colors"
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>Linked from ({backlinks.length})</span>
      </button>

      {open && (
        <div className="space-y-1">
          {backlinks.map((note) => (
            <button
              key={note.id}
              onClick={() => openNote(note)}
              className="w-full text-left text-xs font-sans text-muted
                         hover:text-ink transition-colors truncate block py-0.5"
            >
              ← {note.title || "Untitled"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
