import { useEffect, useRef, useCallback, useState } from "react";
import {
  Pin,
  Archive,
  Trash2,
  Tag,
  Clock,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { useNoteStore } from "../note.store";

const AUTO_SAVE_DELAY = 800; // ms

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({ noteId, tags }: { noteId: string; tags: string[] }) {
  const { updateNote } = useNoteStore();
  const [input, setInput] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed || tags.includes(trimmed)) return;
    updateNote(noteId, { tags: [...tags, trimmed] });
    setInput("");
  };

  const removeTag = (tag: string) => {
    updateNote(noteId, { tags: tags.filter((t) => t !== tag) });
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Tag size={10} className="text-subtle shrink-0" />
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 text-2xs font-mono text-subtle bg-overlay rounded px-1.5 py-0.5"
        >
          #{tag}
          <button onClick={() => removeTag(tag)} className="hover:text-danger transition-colors">
            <X size={8} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(input);
          }
          if (e.key === "Backspace" && !input && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        onBlur={() => { if (input) addTag(input); }}
        placeholder="add tag…"
        className="text-2xs font-mono text-subtle bg-transparent outline-none placeholder:text-subtle/40 w-16"
      />
    </div>
  );
}

// ── Note Editor ───────────────────────────────────────────────────────────────

export function NoteEditor() {
  const { activeNoteId, notes, updateNote, deleteNote, pinNote, archiveNote } = useNoteStore();
  const note = notes.find((n) => n.id === activeNoteId);

  const titleRef    = useRef<HTMLTextAreaElement>(null);
  const bodyRef     = useRef<HTMLTextAreaElement>(null);
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-save ──────────────────────────────────────────────────────────────

  const scheduleUpdate = useCallback(
    (patch: Parameters<typeof updateNote>[1]) => {
      if (!activeNoteId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateNote(activeNoteId, patch);
      }, AUTO_SAVE_DELAY);
    },
    [activeNoteId, updateNote]
  );

  // Flush on unmount / note switch
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [activeNoteId]);

  // Auto-resize title textarea
  const autoResizeTitle = useCallback(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(autoResizeTitle, [note?.title, autoResizeTitle]);

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center space-y-2 animate-fade-in">
          <p className="font-serif italic text-5xl text-muted/20 select-none">∅</p>
          <p className="text-xs text-subtle font-sans">Select a note to edit</p>
        </div>
      </div>
    );
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDelete = () => {
    if (confirm(`Delete "${note.title}"? This cannot be undone.`)) {
      deleteNote(note.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-surface min-w-0 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0">
        <div className="flex-1 flex items-center gap-1.5 text-2xs text-subtle font-mono">
          <Clock size={9} />
          <span>{format(note.updatedAt, "MMM d, yyyy · HH:mm")}</span>
        </div>

        <button
          onClick={() => pinNote(note.id, !note.pinned)}
          title={note.pinned ? "Unpin" : "Pin"}
          className={clsx(
            "p-1.5 rounded transition-colors",
            note.pinned ? "text-amber bg-amber/10" : "text-subtle hover:text-ink hover:bg-raised"
          )}
        >
          <Pin size={13} />
        </button>

        <button
          onClick={() => archiveNote(note.id, !note.archived)}
          title={note.archived ? "Unarchive" : "Archive"}
          className="p-1.5 rounded text-subtle hover:text-ink hover:bg-raised transition-colors"
        >
          <Archive size={13} />
        </button>

        <button
          onClick={handleDelete}
          title="Delete note"
          className="p-1.5 rounded text-subtle hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto px-8 md:px-16 py-8 max-w-4xl mx-auto w-full">
        {/* Title */}
        <textarea
          ref={titleRef}
          defaultValue={note.title}
          key={`title-${note.id}`}
          onChange={(e) => {
            autoResizeTitle();
            scheduleUpdate({ title: e.target.value });
          }}
          rows={1}
          placeholder="Note title…"
          className={clsx(
            "w-full resize-none bg-transparent outline-none",
            "font-serif text-3xl font-light text-ink leading-snug",
            "placeholder:text-muted/30",
            "mb-2"
          )}
        />

        {/* Tags */}
        <div className="mb-6">
          <TagInput noteId={note.id} tags={note.tags} />
        </div>

        {/* Body */}
        <textarea
          ref={bodyRef}
          defaultValue={note.body}
          key={`body-${note.id}`}
          onChange={(e) => scheduleUpdate({ body: e.target.value })}
          placeholder="Start writing…"
          className={clsx(
            "w-full min-h-[60vh] resize-none bg-transparent outline-none",
            "font-serif text-base text-ink/90 leading-[1.9]",
            "placeholder:text-muted/25"
          )}
        />
      </div>
    </div>
  );
}
