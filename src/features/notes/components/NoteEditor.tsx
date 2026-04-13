import { useEffect, useRef, useCallback, useState } from "react";
import {
  Pin, Archive, Trash2, Tag, Clock, X,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { useNoteStore } from "../note.store";
import { useKernel } from "@/core";
import { SYNC_EVENTS } from "../events";
import { useSidebarStore } from "@/features/sidebar/sidebar.store";
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
        <span key={tag} className="flex items-center gap-1 text-2xs font-mono text-subtle bg-raised rounded px-1.5 py-0.5">
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
        className="text-2xs font-mono text-subtle bg-transparent outline-none placeholder:text-subtle/40 w-16"
      />
    </div>
  );
}

// ── SingleEditor — renders one note (used for both main + split) ───────────────

interface SingleEditorProps {
  noteId:          string;
  isSplit?:        boolean;
  onClose?:        () => void;
  panelOpen?:      boolean;
  onTogglePanel?:  () => void;
}

export function SingleEditor({ noteId, isSplit, onClose, panelOpen, onTogglePanel }: SingleEditorProps) {
  const { notes, updateNote, deleteNote, pinNote, archiveNote } = useNoteStore();
  const kernel  = useKernel();
  const note    = notes.find((n: Note) => n.id === noteId);

  const titleRef  = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<TipTapEditorHandle>(null);
  const draft     = useRef<Partial<Omit<Note, "id" | "createdAt">>>({});
  const draftId   = useRef<string>(noteId);

  const flush = useCallback(() => {
    const id = draftId.current;
    if (!id || Object.keys(draft.current).length === 0) return;
    updateNote(id, draft.current);
    draft.current = {};
    kernel.events.emit(SYNC_EVENTS.NOTE_FLUSHED, { id });
  }, [updateNote, kernel]);

  useEffect(() => () => { flush(); }, [noteId, flush]);
  useEffect(() => {
    window.addEventListener("blur", flush);
    return () => window.removeEventListener("blur", flush);
  }, [flush]);
  useEffect(() => { draftId.current = noteId; draft.current = {}; }, [noteId]);

  const resizeTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useEffect(() => { resizeTitle(); }, [noteId, resizeTitle]);

  const handleContentUpdate = useCallback((json: TipTapDoc) => {
    draft.current.content = json;
    draft.current.body    = (json.content ?? [])
      .map((n) => (n.content ?? []).map((t) => t.text ?? "").join(""))
      .join("\n");
  }, []);

  if (!note) return (
    <div className="flex-1 flex items-center justify-center bg-surface">
      <p className="text-xs text-subtle font-sans">Note not found</p>
    </div>
  );

  const handleDelete = () => {
    if (confirm(`Delete "${note.title}"? This cannot be undone.`)) {
      draft.current = {};
      deleteNote(note.id);
    }
  };

  return (
    <div className={clsx("flex flex-col overflow-hidden min-w-0 bg-surface", isSplit ? "flex-1 border-l border-border" : "flex-1")}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0">
        {onTogglePanel && (
          <button
            onClick={onTogglePanel}
            title={panelOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="p-1.5 rounded text-subtle hover:text-ink hover:bg-raised transition-colors mr-1"
          >
            {panelOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
          </button>
        )}
        <div className="flex-1 flex items-center gap-1.5 text-2xs text-subtle font-mono">
          <Clock size={9} />
          <span>{format(note.updatedAt, "MMM d, yyyy · HH:mm")}</span>
        </div>
        <button
          onClick={() => { flush(); pinNote(note.id, !note.pinned); }}
          title={note.pinned ? "Unpin" : "Pin"}
          className={clsx("p-1.5 rounded transition-colors",
            note.pinned ? "text-amber bg-amber/10" : "text-subtle hover:text-ink hover:bg-raised")}
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
        <button onClick={handleDelete} title="Delete note"
          className="p-1.5 rounded text-subtle hover:text-danger hover:bg-danger/10 transition-colors">
          <Trash2 size={13} />
        </button>
        {isSplit && onClose && (
          <button onClick={onClose} title="Close split"
            className="p-1.5 rounded text-subtle hover:text-ink hover:bg-raised transition-colors ml-1">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 py-8 pb-32">
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
          <p className="text-2xs text-subtle font-mono mb-4">
            {format(note.createdAt, "MMMM d, yyyy")}
          </p>
          <div className="mb-6">
            <TagInput noteId={note.id} tags={note.tags} />
          </div>
          <div className="h-px bg-border mb-6" />
          <TipTapEditor
            ref={editorRef}
            key={note.id}
            noteId={note.id}
            content={getNoteContent(note)}
            onUpdate={handleContentUpdate}
            onFocus={() => { draftId.current = noteId; }}
            onBlur={flush}
          />
        </div>
      </div>
    </div>
  );
}

// ── NoteEditor — main editor with collapse + split controls ───────────────────

export function NoteEditor() {
  const { activeNoteId, splitNoteId, setSplitNote, notes } = useNoteStore();
  const { activePanel, setActivePanel } = useSidebarStore();
  const panelOpen = !!activePanel;

  const note      = notes.find((n: Note) => n.id === activeNoteId);
  const splitNote = notes.find((n: Note) => n.id === splitNoteId);

  if (!activeNoteId || !note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center space-y-3 animate-fade-in">
          <p className="font-serif italic text-5xl text-muted/20 select-none">∅</p>
          <p className="text-xs text-subtle font-sans">Select a note to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <SingleEditor
        noteId={activeNoteId}
        panelOpen={panelOpen}
        onTogglePanel={() => setActivePanel(panelOpen ? null : "notes")}
      />
      {splitNoteId && splitNote && (
        <SingleEditor
          noteId={splitNoteId}
          isSplit
          onClose={() => setSplitNote(null)}
        />
      )}
    </div>
  );
}