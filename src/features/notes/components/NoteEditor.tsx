// ─────────────────────────────────────────────────────────────────────────────
// NoteEditor
// Renders inside a fixed-width page canvas (A4, Letter, etc.).
// Flush strategy: accumulate draft in refs, write to store only on blur /
// tab switch / window blur. Zero timers.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback, useState } from "react";
import { Pin, Archive, Trash2, Tag, Clock, X } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { useNoteStore } from "../note.store";
import { useKernel } from "@/core";
import { SYNC_EVENTS } from "@/bridge/tauri-sync";
import { PageCanvas, PageSizeSelector } from "./PageCanvas";
import { ExportMenu } from "@/features/export/components/ExportMenu";
import type { Note } from "../types";
import type { PageSizeName } from "../page-sizes";

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
    <div className="flex items-center gap-1.5 flex-wrap mb-6">
      <Tag size={10} className="text-[#9a9080] shrink-0" />
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 text-[11px] font-mono text-[#9a9080]
                     bg-[#ede9e2] rounded px-1.5 py-0.5"
        >
          #{tag}
          <button
            onClick={() => removeTag(tag)}
            className="hover:text-red-500 transition-colors"
          >
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
        className="text-[11px] font-mono text-[#9a9080] bg-transparent outline-none
                   placeholder:text-gray-300 w-16"
      />
    </div>
  );
}

// ── NoteEditor ────────────────────────────────────────────────────────────────

export function NoteEditor() {
  const { activeNoteId, notes, updateNote, deleteNote, pinNote, archiveNote } = useNoteStore();
  const note   = notes.find((n: Note) => n.id === activeNoteId);
  const kernel = useKernel();

  const titleRef    = useRef<HTMLTextAreaElement>(null);
  const bodyRef     = useRef<HTMLTextAreaElement>(null);
  const draft       = useRef<Partial<Omit<Note, "id" | "createdAt">>>({});
  const draftNoteId = useRef<string | null>(null);

  // ── Flush ──────────────────────────────────────────────────────────────────

  const flush = useCallback(() => {
    const id = draftNoteId.current;
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
    draftNoteId.current = activeNoteId;
    draft.current = {};
  }, [activeNoteId]);

  // ── Auto-resize title textarea ─────────────────────────────────────────────

  const autoResizeTitle = useCallback(() => {
    const el = titleRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
  }, []);

  useEffect(autoResizeTitle, [note?.title, autoResizeTitle]);

  // ── Page size change ───────────────────────────────────────────────────────

  const handlePageSizeChange = useCallback(
    (size: PageSizeName) => {
      if (!activeNoteId) return;
      updateNote(activeNoteId, { pageSize: size });
      kernel.events.emit(SYNC_EVENTS.NOTE_FLUSHED, { id: activeNoteId });
    },
    [activeNoteId, updateNote, kernel]
  );

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

  const handleDelete = () => {
    if (confirm(`Delete "${note.title}"? This cannot be undone.`)) {
      draft.current = {};
      deleteNote(note.id);
    }
  };

  const pageSize = note.pageSize ?? "a4";

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 animate-fade-in">
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0 bg-surface">
        <div className="flex-1 flex items-center gap-1.5 text-2xs text-subtle font-mono">
          <Clock size={9} />
          <span>{format(note.updatedAt, "MMM d, yyyy · HH:mm")}</span>
        </div>

        <PageSizeSelector value={pageSize} onChange={handlePageSizeChange} />

        <div className="w-px h-3 bg-border mx-1" />

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

      {/* ── Page canvas ────────────────────────────────────────────────────── */}
      <PageCanvas size={pageSize}>
        {/* Title */}
        <textarea
          ref={titleRef}
          defaultValue={note.title}
          key={`title-${note.id}`}
          onChange={(e) => { autoResizeTitle(); draft.current.title = e.target.value; }}
          onBlur={flush}
          rows={1}
          placeholder="Note title…"
          className="w-full resize-none bg-transparent outline-none
                     font-serif text-[28px] font-light text-gray-900
                     leading-snug placeholder:text-gray-300 mb-3"
        />

        {/* Tags */}
        <TagInput noteId={note.id} tags={note.tags} />

        {/* Divider */}
        <div className="h-px bg-[#e0dbd2] mb-6" />

        {/* Body */}
        <textarea
          ref={bodyRef}
          defaultValue={note.body}
          key={`body-${note.id}`}
          onChange={(e) => { draft.current.body = e.target.value; }}
          onBlur={flush}
          placeholder="Start writing…"
          className="w-full min-h-[400px] resize-none bg-transparent outline-none
                     font-serif text-[15px] text-gray-800 leading-[1.9]
                     placeholder:text-gray-300"
        />
      </PageCanvas>
    </div>
  );
}