import {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useState,
} from "react";
import { Pin, Archive, Trash2, Tag, Clock, X, Plus, Trash } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { useNoteStore } from "../note.store";
import { useKernel } from "@/core";
import { SYNC_EVENTS } from "@/bridge/tauri-sync";
import { PageSizeSelector } from "./PageCanvas";
import { ExportMenu } from "@/features/export/components/ExportMenu";
import {
  PAGE_SIZES,
  contentDimensions,
  FIRST_PAGE_HEADER_HEIGHT,
  type PageSizeName,
} from "../page-sizes";
import type { Note } from "../types";

// ── Page helpers ──────────────────────────────────────────────────────────────

const PAGE_SEP = "\f";

function splitPages(body: string): string[] {
  const pages = body.split(PAGE_SEP);
  return pages.length > 0 ? pages : [""];
}

function joinPages(pages: string[]): string {
  return pages.join(PAGE_SEP);
}

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
    <div className="flex items-center gap-1.5 flex-wrap mb-4">
      <Tag size={10} className="text-[#9a9080] shrink-0" />
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 text-[11px] font-mono text-[#9a9080]
                     bg-[#ede9e2] rounded px-1.5 py-0.5"
        >
          #{tag}
          <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
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

// ── Single page ───────────────────────────────────────────────────────────────

interface PageProps {
  index:         number;
  total:         number;
  content:       string;
  bodyHeight:    number;
  pageWidth:     number;
  pageHeight:    number;
  marginTop:     number;
  marginBottom:  number;
  marginLeft:    number;
  marginRight:   number;
  isFirst:       boolean;
  noteId:        string;
  noteTags:      string[];
  noteTitle:     string;
  titleRef?:     React.RefObject<HTMLTextAreaElement>;
  onTitleChange: (v: string) => void;
  onTitleBlur:   () => void;
  bodyRef:       (el: HTMLTextAreaElement | null) => void;
  onChange:      (v: string) => void;
  onKeyDown:     (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus:       () => void;
  onBlur:        () => void;
  onDelete:      () => void;
  canDelete:     boolean;
}

function Page({
  index, total, content, bodyHeight,
  pageWidth, pageHeight, marginTop, marginBottom, marginLeft, marginRight,
  isFirst, noteId, noteTags, noteTitle, titleRef,
  onTitleChange, onTitleBlur,
  bodyRef, onChange, onKeyDown, onFocus, onBlur,
  onDelete, canDelete,
}: PageProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[10px] font-mono text-gray-500 select-none">
          {index + 1} / {total}
        </span>
        {canDelete && (
          <button
            onClick={onDelete}
            className="text-[10px] font-mono text-gray-400 hover:text-red-400
                       transition-colors flex items-center gap-1"
          >
            <Trash size={9} /> delete page
          </button>
        )}
      </div>

      <div
        className="relative shadow-[0_4px_32px_rgba(0,0,0,0.35)]"
        style={{
          width:           pageWidth,
          height:          pageHeight,
          paddingTop:      marginTop,
          paddingBottom:   marginBottom,
          paddingLeft:     marginLeft,
          paddingRight:    marginRight,
          backgroundColor: "#f7f4ef",
          overflow:        "hidden",
        }}
        data-page-index={index}
      >
        {isFirst && (
          <>
            <textarea
              ref={titleRef}
              defaultValue={noteTitle}
              key={`title-${noteId}`}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={onTitleBlur}
              rows={1}
              placeholder="Note title…"
              className="w-full resize-none bg-transparent outline-none overflow-hidden
                         font-serif text-[28px] font-light text-gray-900
                         leading-snug placeholder:text-gray-300 mb-3"
            />
            <TagInput noteId={noteId} tags={noteTags} />
            <div className="h-px bg-[#e0dbd2] mb-4" />
          </>
        )}

        <textarea
          ref={bodyRef}
          defaultValue={content}
          key={`page-${noteId}-${index}`}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={isFirst ? "Start writing…" : ""}
          style={{ height: bodyHeight }}
          className="w-full resize-none bg-transparent outline-none overflow-hidden
                     font-serif text-[15px] text-gray-800 leading-[1.9]
                     placeholder:text-gray-300"
        />
      </div>
    </div>
  );
}

// ── NoteEditor ────────────────────────────────────────────────────────────────

export function NoteEditor() {
  const { activeNoteId, notes, updateNote, deleteNote, pinNote, archiveNote } = useNoteStore();
  const note   = notes.find((n: Note) => n.id === activeNoteId);
  const kernel = useKernel();

  // ── Refs ──────────────────────────────────────────────────────────────────
  const titleRef       = useRef<HTMLTextAreaElement>(null);
  const bodyRefs       = useRef<(HTMLTextAreaElement | null)[]>([]);
  const draft          = useRef<Partial<Omit<Note, "id" | "createdAt">>>({});
  const draftId        = useRef<string | null>(null);

  // ── Draft pages — ref-based, never stale ─────────────────────────────────
  // Pages always come from the store unless we have in-flight edits.
  // When activeNoteId changes, the mismatch is detected synchronously during
  // render and the draft is cleared — so pages are ALWAYS correct on mount.
  const draftPages     = useRef<string[] | null>(null);
  const draftNoteIdRef = useRef<string | null>(null);

  // Synchronous draft invalidation — runs during render, not in an effect
  if (draftNoteIdRef.current !== activeNoteId) {
    draftPages.current    = null;
    draftNoteIdRef.current = activeNoteId;
  }

  // Source of truth: draft if editing, store otherwise
  const storePages = splitPages(note?.body ?? "");
  const pages      = draftPages.current ?? storePages;

  // ── Flush ─────────────────────────────────────────────────────────────────

  const flush = useCallback(() => {
    const id = draftId.current;
    if (!id || Object.keys(draft.current).length === 0) return;
    updateNote(id, draft.current);
    draft.current      = {};
    draftPages.current = null; // store is now source of truth again
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

  useLayoutEffect(() => { resizeTitle(); }, [note?.id, resizeTitle]);

  // ── Page size ─────────────────────────────────────────────────────────────

  const handlePageSizeChange = useCallback(
    (size: PageSizeName) => {
      if (!activeNoteId) return;
      updateNote(activeNoteId, { pageSize: size });
      kernel.events.emit(SYNC_EVENTS.NOTE_FLUSHED, { id: activeNoteId });
    },
    [activeNoteId, updateNote, kernel]
  );

  // ── Page mutations ────────────────────────────────────────────────────────

  const commitPages = useCallback((newPages: string[]) => {
    draftPages.current = newPages;
    draft.current.body = joinPages(newPages);
  }, []);

  const handlePageChange = useCallback(
    (index: number, value: string) => {
      const textarea = bodyRefs.current[index];
      const newPages = [...pages];
      newPages[index] = value;

      if (textarea && textarea.scrollHeight > textarea.clientHeight + 2) {
        const lastBreak = value.lastIndexOf("\n");
        if (lastBreak > 0) {
          const fits     = value.slice(0, lastBreak);
          const overflow = value.slice(lastBreak + 1);
          newPages[index] = fits;

          if (index + 1 < newPages.length) {
            newPages[index + 1] = overflow
              ? overflow + (newPages[index + 1] ? "\n" + newPages[index + 1] : "")
              : newPages[index + 1];
          } else {
            newPages.push(overflow);
          }

          commitPages(newPages);
          setTimeout(() => {
            const next = bodyRefs.current[index + 1];
            if (next) { next.focus(); next.setSelectionRange(overflow.length, overflow.length); }
          }, 0);
          return;
        }
      }

      commitPages(newPages);
    },
    [pages, commitPages]
  );

  const handlePageKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
      const textarea = bodyRefs.current[index];
      if (!textarea) return;

      if (
        e.key === "Backspace" &&
        textarea.selectionStart === 0 &&
        textarea.selectionEnd === 0 &&
        index > 0
      ) {
        e.preventDefault();
        const newPages = [...pages];
        const prevLen  = newPages[index - 1].length;
        newPages[index - 1] = newPages[index - 1] + newPages[index];
        newPages.splice(index, 1);
        commitPages(newPages);
        flush();
        setTimeout(() => {
          const prev = bodyRefs.current[index - 1];
          if (prev) { prev.focus(); prev.setSelectionRange(prevLen, prevLen); }
        }, 0);
      }
    },
    [pages, commitPages, flush]
  );

  const addPage = useCallback(() => {
    const newPages = [...pages, ""];
    commitPages(newPages);
    flush();
    setTimeout(() => { bodyRefs.current[newPages.length - 1]?.focus(); }, 50);
  }, [pages, commitPages, flush]);

  const deletePage = useCallback(
    (index: number) => {
      if (pages.length <= 1) return;
      const newPages = pages.filter((_, i) => i !== index);
      commitPages(newPages);
      flush();
      setTimeout(() => {
        bodyRefs.current[Math.min(index, newPages.length - 1)]?.focus();
      }, 50);
    },
    [pages, commitPages, flush]
  );

  // ── Empty state ───────────────────────────────────────────────────────────

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

  const pageSize              = note.pageSize ?? "a4";
  const dims                  = PAGE_SIZES[pageSize];
  const { height: contentH }  = contentDimensions(pageSize);
  const firstBodyH            = contentH - FIRST_PAGE_HEADER_HEIGHT;
  const otherBodyH            = contentH;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 animate-fade-in">
      {/* ── Toolbar ── */}
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

      {/* ── Desk ── */}
      <div
        className="flex-1 overflow-y-auto px-8 py-10 noter-desk"
        style={{ background: "#2c2c2c" }}
      >
        <div className="flex flex-col items-center gap-8">
          {pages.map((content, index) => (
            <Page
              key={`${note.id}-page-${index}`}
              index={index}
              total={pages.length}
              content={content}
              bodyHeight={index === 0 ? firstBodyH : otherBodyH}
              pageWidth={dims.width}
              pageHeight={dims.height}
              marginTop={dims.marginTop}
              marginBottom={dims.marginBottom}
              marginLeft={dims.marginLeft}
              marginRight={dims.marginRight}
              isFirst={index === 0}
              noteId={note.id}
              noteTags={note.tags}
              noteTitle={note.title}
              titleRef={index === 0 ? titleRef : undefined}
              onTitleChange={(v) => { resizeTitle(); draft.current.title = v; }}
              onTitleBlur={flush}
              bodyRef={(el) => { bodyRefs.current[index] = el; }}
              onChange={(v) => handlePageChange(index, v)}
              onKeyDown={(e) => handlePageKeyDown(e, index)}
              onFocus={() => { draftId.current = activeNoteId; }}
              onBlur={flush}
              onDelete={() => deletePage(index)}
              canDelete={pages.length > 1 && index > 0}
            />
          ))}

          <button
            onClick={addPage}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                       text-xs font-mono text-gray-400 border border-dashed border-gray-600
                       hover:border-amber/50 hover:text-amber transition-colors"
          >
            <Plus size={12} /> add page
          </button>
        </div>
      </div>
    </div>
  );
}