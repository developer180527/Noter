import { format } from "date-fns";
import { FileText, Pin, Tag, Archive } from "lucide-react";
import { clsx } from "clsx";
import { useNoteStore } from "@/features/notes/note.store";
import type { Note } from "@/features/notes/types";
import type { TabComponentProps } from "@/features/tabs/types";

function NoteRow({ note }: { note: Note }) {
  const { setActiveNote } = useNoteStore();

  return (
    <button
      onClick={() => setActiveNote(note.id)}
      className="w-full text-left flex items-center gap-4 px-4 py-2.5 hover:bg-raised border-b border-border/40 transition-colors group"
    >
      <FileText size={13} className="text-subtle shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {note.pinned && <Pin size={9} className="text-amber shrink-0" />}
          <span className="text-xs font-sans text-ink/80 truncate">{note.title || "Untitled"}</span>
        </div>
        {note.tags.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {note.tags.slice(0, 4).map((t) => (
              <span key={t} className="text-2xs font-mono text-subtle">#{t}</span>
            ))}
          </div>
        )}
      </div>

      <span className="text-2xs font-mono text-subtle shrink-0">
        {format(note.updatedAt, "MMM d, yyyy")}
      </span>

      {note.archived && (
        <Archive size={11} className="text-subtle shrink-0" />
      )}
    </button>
  );
}

export function LibraryPage(_props: TabComponentProps) {
  const allNotes = useNoteStore((s) => s.notes);
  const { allTags } = useNoteStore();
  const tags = allTags();

  const total    = allNotes.length;
  const archived = allNotes.filter((n) => n.archived).length;
  const pinned   = allNotes.filter((n) => n.pinned).length;

  const sorted = [...allNotes].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-6 py-6 border-b border-border">
        <h1 className="font-serif text-2xl text-ink font-light">Library</h1>
        <div className="flex gap-4 mt-2">
          {[
            { label: "notes", value: total },
            { label: "pinned", value: pinned },
            { label: "archived", value: archived },
            { label: "tags", value: tags.length },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-lg font-mono text-amber leading-none">{value}</p>
              <p className="text-2xs font-sans text-subtle mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tag cloud */}
      {tags.length > 0 && (
        <div className="px-6 py-3 border-b border-border flex gap-1.5 flex-wrap">
          <Tag size={11} className="text-subtle mt-0.5 shrink-0" />
          {tags.map((tag) => (
            <span
              key={tag}
              className={clsx(
                "text-2xs font-mono text-subtle bg-overlay rounded px-1.5 py-0.5 cursor-default"
              )}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* All notes table */}
      <div className="flex-1 overflow-y-auto">
        {sorted.map((note) => (
          <NoteRow key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}
