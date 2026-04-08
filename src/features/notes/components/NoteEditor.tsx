import { useEffect, useRef, useCallback, useState } from "react";
import { Pin, Archive, Trash2, Tag, Clock, X } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { useNoteStore } from "../note.store";
import { useKernel } from "@/core";
import { SYNC_EVENTS } from "@/bridge/tauri-sync";
import { ExportMenu } from "@/features/export/components/ExportMenu";
import { TipTapEditor, type TipTapEditorHandle } from "./TipTapEditor";
import { getNoteContent, type TipTapDoc, type Note } from "../types";

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

  const removeTag = (tag: string) =>
    updateNote(noteId, { tags: tags.filter((t) => t !== tag) });

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Tag size={10} className="text-subtle shrink-0" />
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 text-2xs font-mono text-subtle
                     bg-raised rounded px-1.5 py-0.5"
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
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input); }
          if (e.key === "Backspace" && !input && tags.length > 0) removeTag(tags[tags.length - 1]);
        }}
        onBlur={() => { if (input) addTag(input); }}
        placeholder="add tag…"
        className="text-2xs font-mono text-subtle bg-transparent outline-none
                   placeholder:text-subtle/40 w-16"
      />
    </div>
  );
}

// ── NoteEditor ────────────────────────────────────────────────────────────────

export function NoteEditor() {
  const { activeNoteId, notes, updateNote, deleteNote, pinNote, archiveNote } = useNoteStore();
  const note   = notes.find((n: Note) => n.id === activeNoteId);
  const kernel = useKernel();

  const titleRef  = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<TipTapEditorHandle>(null);
  const draft     = useRef<Partial<Omit<Note, "id" | "createdAt">>>({});
  const draftId   = useRef<string | null>(null);

  // ── Flush ─────────────────────────────────────────────────────────────────

  const flush = useCallback(() => {
    const id = draftId.current;
    if (!id || Object.keys(draft.current).length === 0) return;
    updateNote(id, draft.current);
    draft.current = {};
    kernel.events.emit(SYNC_EVENTS.NOTE_FLUSHED, { id });
  }, [updateNote, kernel]);

  useEffect(() => () => { flush(); }, [activeNoteId, flush]);
  useEffect(() => {
    window.addEventListener("blur", flush);
    return () => window.removeEventListener("blur", flush);
  }, [flush]);
  useEffect(() => {
    draftId.current = activeNoteId;
    draft.current   = {};
  }, [activeNoteId]);

  // ── Title resize ──────────────────────────────────────────────────────────

  const resizeTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => { resizeTitle(); }, [note?.id, resizeTitle]);

  // ── Content update ────────────────────────────────────────────────────────

  const handleContentUpdate = useCallback((json: TipTapDoc) => {
    draft.current.content = json;
    draft.current.body    = (json.content ?? [])
      .map((n) => (n.content ?? []).map((t) => t.text ?? "").join(""))
      .join("\n");
  }, []);

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center space-y-3 animate-fade-in">
          <p className="font-serif italic text-5xl text-muted/20 select-none">∅</p>
          <p className="text-xs text-subtle font-sans">Select a note to edit</p>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm(`Delete "${note.title}"? This cannot be undone.`)) {
      draft.current = {};
      deleteNote(note.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 animate-fade-in bg-surface">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-5 py-2 border-b border-border shrink-0">
        <div className="flex-1 flex items-center gap-1.5 text-2xs text-subtle font-mono">
          <Clock size={9} />
          <span>{format(note.updatedAt, "MMM d, yyyy · HH:mm")}</span>
        </div>
        <button
          onClick={() => { flush(); pinNote(note.id, !note.pinned); }}
          title={note.pinned ? "Unpin" : "Pin"}
          className={clsx(
            "p-1.5 rounded transition-colors",
            note.pinned ? "text-amber bg-amber/10" : "text-subtle hover:text-ink hover:bg-raised"
          )}
        >
          <Pin size={13} />
        </button>
        <button
          onClick={() => { flush(); archiveNote(note.id, !note.archived); }}
          title={note.archived ? "Unarchive" : "Archive"}
          className="p-1.5 rounded text-subtle hover:text-ink hover:bg-raised transition-colors"
        >
          <Archive size={13} />
        </button>
        <ExportMenu note={note} />
        <button
          onClick={handleDelete}
          title="Delete note"
          className="p-1.5 rounded text-subtle hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* ── Content — just flows, no pages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 py-8 pb-32">
          {/* Title */}
          <textarea
            ref={titleRef}
            defaultValue={note.title}
            key={`title-${note.id}`}
            onChange={(e) => { resizeTitle(); draft.current.title = e.target.value; }}
            onBlur={flush}
            rows={1}
            placeholder="Untitled"
            className="w-full resize-none bg-transparent outline-none overflow-hidden
                       font-serif text-3xl font-semibold text-ink
                       leading-tight placeholder:text-muted/30 mb-2"
          />

          {/* Timestamp under title */}
          <p className="text-2xs text-subtle font-mono mb-4">
            {format(note.createdAt, "MMMM d, yyyy")}
          </p>

          {/* Tags */}
          {(note.tags.length > 0 || true) && (
            <div className="mb-6">
              <TagInput noteId={note.id} tags={note.tags} />
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-border mb-6" />

          {/* Editor — content just flows, no limits */}
          <TipTapEditor
            ref={editorRef}
            key={note.id}
            noteId={note.id}
            content={getNoteContent(note)}
            onUpdate={handleContentUpdate}
            onFocus={() => { draftId.current = activeNoteId; }}
            onBlur={flush}
          />
        </div>
      </div>
    </div>
  );
}