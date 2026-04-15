import { useState, useCallback } from "react";
import { Search, Plus, Pin, Tag, Archive, ExternalLink, Columns2 } from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { useNoteStore, filterNotes, extractTags, extractText } from "../note.store";
import { useTabStore } from "@/features/tabs/tab.store";
import type { Note, NoteStore } from "../types";

// ── Note Card ─────────────────────────────────────────────────────────────────

function NoteCard({ note, isActive }: { note: Note; isActive: boolean }) {
  const { setActiveNote, setSplitNote, splitNoteId } = useNoteStore();
  const { openTab } = useTabStore();
  const [hovered, setHovered] = useState(false);

  const excerpt = note.content
    ? extractText(note.content).slice(0, 100).trim()
    : note.body.slice(0, 100).trim();

  const openInTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    openTab({
      id:        `note-${note.id}`,
      title:     note.title || "Untitled",
      component: () => null,
      props:     { _componentKey: "note-viewer", noteId: note.id },
      closeable: true,
      pinned:    false,
    });
  };

  const openAsSplit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSplitNote(splitNoteId === note.id ? null : note.id);
  };

  return (
    <button
      onClick={() => setActiveNote(note.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={clsx(
        "w-full text-left px-3 py-2.5 border-b border-border transition-colors",
        "group hover:bg-raised/70",
        isActive ? "bg-raised border-l-2 border-l-amber pl-[10px]" : "border-l-2 border-l-transparent"
      )}
    >
      <div className="flex items-start justify-between gap-1 min-w-0">
        <span className={clsx("text-xs font-sans font-medium truncate flex-1 min-w-0",
          isActive ? "text-ink" : "text-ink/80")}>
          {note.pinned && <Pin size={9} className="inline mr-1 text-amber" />}
          {note.title || "Untitled"}
        </span>
        {hovered ? (
          <div className="flex items-center gap-0.5 shrink-0">
            <span
              onClick={openAsSplit}
              title="Open in split view"
              className={clsx("p-0.5 rounded transition-colors",
                splitNoteId === note.id ? "text-amber" : "text-subtle hover:text-ink")}
            >
              <Columns2 size={10} />
            </span>
            <span
              onClick={openInTab}
              title="Open in new tab"
              className="p-0.5 rounded text-subtle hover:text-ink transition-colors"
            >
              <ExternalLink size={10} />
            </span>
          </div>
        ) : (
          <span className="text-2xs text-subtle font-mono shrink-0 mt-px">
            {formatDistanceToNow(note.updatedAt, { addSuffix: false })}
          </span>
        )}
      </div>

      {excerpt && (
        <p className="text-2xs text-muted mt-0.5 line-clamp-2 font-sans leading-relaxed text-left">
          {excerpt}
        </p>
      )}

      {note.tags.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-2xs font-mono text-subtle bg-overlay/60 rounded px-1 py-0.5">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ── Note List ─────────────────────────────────────────────────────────────────

export function NoteList() {
  const { activeNoteId, filter, setFilter, createNote } = useNoteStore();
  const rawNotes = useNoteStore((s: NoteStore) => s.notes);
  const notes = filterNotes(rawNotes, filter);
  const tags  = extractTags(rawNotes);
  const [showTags, setShowTags] = useState(false);

  const handleCreate = useCallback(() => {
    createNote();
  }, [createNote]);

  return (
    <div className="flex flex-col h-full bg-surface min-w-0 flex-1">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-border shrink-0">
        <div className="relative flex-1">
          <Search
            size={11}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search notes…"
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="w-full bg-overlay border border-border rounded text-xs font-sans text-ink
                       placeholder:text-subtle pl-6 pr-2 py-1 outline-none focus:border-amber/50
                       transition-colors"
          />
        </div>

        <button
          onClick={() => setShowTags((v) => !v)}
          className={clsx(
            "p-1 rounded transition-colors",
            showTags ? "text-amber bg-amber/10" : "text-muted hover:text-ink hover:bg-raised"
          )}
          title="Filter by tag"
        >
          <Tag size={12} />
        </button>

        <button
          onClick={handleCreate}
          className="p-1 rounded text-muted hover:text-amber hover:bg-amber/10 transition-colors"
          title="New note (⌘N)"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Tag filter strip */}
      {showTags && tags.length > 0 && (
        <div className="flex gap-1 px-2 py-1.5 border-b border-border overflow-x-auto flex-wrap max-h-20">
          <button
            onClick={() => setFilter({ tag: null })}
            className={clsx(
              "text-2xs font-mono rounded px-1.5 py-0.5 shrink-0 transition-colors",
              filter.tag === null
                ? "bg-amber/20 text-amber"
                : "bg-overlay text-subtle hover:text-ink"
            )}
          >
            all
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilter({ tag: filter.tag === tag ? null : tag })}
              className={clsx(
                "text-2xs font-mono rounded px-1.5 py-0.5 shrink-0 transition-colors",
                filter.tag === tag
                  ? "bg-amber/20 text-amber"
                  : "bg-overlay text-subtle hover:text-ink"
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Archive toggle */}
      <div className="flex gap-1 px-2.5 pt-1.5 pb-1 shrink-0">
        <button
          onClick={() => setFilter({ archived: false })}
          className={clsx(
            "text-2xs font-sans px-2 py-0.5 rounded transition-colors",
            !filter.archived ? "text-amber" : "text-subtle hover:text-ink"
          )}
        >
          Notes
        </button>
        <button
          onClick={() => setFilter({ archived: true })}
          className={clsx(
            "text-2xs font-sans px-2 py-0.5 rounded transition-colors flex items-center gap-1",
            filter.archived ? "text-amber" : "text-subtle hover:text-ink"
          )}
        >
          <Archive size={9} /> Archive
        </button>
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <p className="text-xs text-subtle font-sans">No notes yet.</p>
            <button
              onClick={handleCreate}
              className="text-xs text-amber hover:text-amber-glow font-sans transition-colors"
            >
              + Create one
            </button>
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard key={note.id} note={note} isActive={note.id === activeNoteId} />
          ))
        )}
      </div>
    </div>
  );
}