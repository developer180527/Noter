import {
  useEffect, useRef, useState,
  forwardRef, useImperativeHandle, useCallback, useMemo,
} from "react";
import { useEditor, EditorContent, NodeViewWrapper } from "@tiptap/react";
import { BubbleMenu }    from "@tiptap/react/menus";
import StarterKit        from "@tiptap/starter-kit";
import ImageExt          from "@tiptap/extension-image";
import Youtube           from "@tiptap/extension-youtube";
import Placeholder       from "@tiptap/extension-placeholder";
import TextAlign         from "@tiptap/extension-text-align";
import Underline         from "@tiptap/extension-underline";
import Highlight         from "@tiptap/extension-highlight";
import Typography        from "@tiptap/extension-typography";
import Link              from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily }    from "@tiptap/extension-font-family";
import type { Editor }   from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code,
  AlignLeft, AlignCenter, AlignRight, Highlighter,
  ImageIcon, Youtube as YoutubeIcon, Link as LinkIcon,
  ExternalLink, Type,
} from "lucide-react";
import { clsx }           from "clsx";
import type { TipTapDoc } from "../types";
import { NoteLink }       from "../extensions/NoteLink";
import { SyncedBlock }    from "../extensions/SyncedBlock";
import { BlockId }        from "../extensions/BlockId";
import { useNoteStore }   from "../note.store";

// ── Handle ────────────────────────────────────────────────────────────────────

export interface TipTapEditorHandle {
  editor:    Editor | null;
  getJSON(): TipTapDoc;
  focus(pos?: "start" | "end"): void;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TipTapEditorProps {
  noteId:       string;
  content:      TipTapDoc;
  placeholder?: string;
  onUpdate:     (json: TipTapDoc) => void;
  onFocus:      () => void;
  onBlur:       () => void;
}

// ── Picker position ───────────────────────────────────────────────────────────

interface PickerPos { top: number; left: number; insertPos: number; }

// ── Fonts ─────────────────────────────────────────────────────────────────────

const FONTS = [
  { label: "Default",  value: "",                                          sample: "Aa" },
  { label: "Sans",     value: "Inter, ui-sans-serif, sans-serif",          sample: "Aa" },
  { label: "Serif",    value: "Lora, Georgia, ui-serif, serif",            sample: "Aa" },
  { label: "Mono",     value: "'JetBrains Mono', ui-monospace, monospace", sample: "Aa" },
  { label: "Rounded",  value: "Nunito, Poppins, sans-serif",               sample: "Aa" },
  { label: "Slab",     value: "'Roboto Slab', 'Zilla Slab', serif",        sample: "Aa" },
];

// ── FontPicker ────────────────────────────────────────────────────────────────

function FontPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const current = FONTS.find(
    (f) => f.value && editor.isActive("textStyle", { fontFamily: f.value })
  );
  const apply = (font: typeof FONTS[number]) => {
    if (font.value) editor.chain().focus().setFontFamily(font.value).run();
    else            editor.chain().focus().unsetFontFamily().run();
    setOpen(false);
  };
  return (
    <div className="relative">
      <button
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        title="Font family"
        className={clsx(
          "flex items-center gap-1 px-1.5 py-1 rounded text-xs font-mono transition-colors",
          open ? "bg-amber/15 text-amber" : "text-[#666] hover:bg-[#e8e4de] hover:text-[#222]"
        )}
      >
        <Type size={11} />
        <span className="hidden sm:inline text-[10px]">{current?.label ?? "Font"}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 z-50 w-36 rounded-xl overflow-hidden shadow-2xl"
               style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="absolute inset-x-0 top-0 h-px"
                 style={{ background: "linear-gradient(90deg,transparent,rgba(212,144,58,0.6),transparent)" }} />
            {FONTS.map((font) => (
              <button key={font.label}
                onMouseDown={(e) => { e.preventDefault(); apply(font); }}
                className={clsx("w-full flex items-center justify-between px-3 py-2 text-xs transition-colors",
                  current?.label === font.label ? "text-amber bg-amber/10" : "text-[#ccc] hover:bg-white/5")}
              >
                <span style={{ fontFamily: font.value || "inherit" }}>{font.label}</span>
                <span className="text-sm opacity-60" style={{ fontFamily: font.value || "inherit" }}>{font.sample}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── BubbleToolbar ─────────────────────────────────────────────────────────────

function BubbleToolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean, onClick: () => void, Icon: LucideIcon, title: string) => (
    <button key={title} onMouseDown={(e) => { e.preventDefault(); onClick(); }} title={title}
      className={clsx("p-1.5 rounded transition-colors",
        active ? "bg-amber/20 text-[#8a5c1f]" : "text-[#666] hover:bg-[#e8e4de] hover:text-[#222]")}>
      <Icon size={13} />
    </button>
  );
  return (
    <BubbleMenu editor={editor}
      className="flex items-center gap-0.5 bg-white border border-[#e0dbd2] rounded-lg shadow-xl px-1.5 py-1 z-50">
      <div className="flex items-center gap-0.5 pr-1 border-r border-[#e8e4de]">
        {btn(editor.isActive("bold"),      () => editor.chain().focus().toggleBold().run(),      Bold,          "Bold ⌘B")}
        {btn(editor.isActive("italic"),    () => editor.chain().focus().toggleItalic().run(),    Italic,        "Italic ⌘I")}
        {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), UnderlineIcon, "Underline ⌘U")}
        {btn(editor.isActive("strike"),    () => editor.chain().focus().toggleStrike().run(),    Strikethrough, "Strike")}
        {btn(editor.isActive("highlight"), () => editor.chain().focus().toggleHighlight().run(), Highlighter,   "Highlight")}
        {btn(editor.isActive("code"),      () => editor.chain().focus().toggleCode().run(),      Code,          "Code")}
      </div>
      <div className="flex items-center gap-0.5 px-1 border-r border-[#e8e4de]">
        {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), Heading1, "H1")}
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2, "H2")}
        {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), Heading3, "H3")}
      </div>
      <div className="flex items-center gap-0.5 px-1 border-r border-[#e8e4de]">
        {btn(editor.isActive("bulletList"),  () => editor.chain().focus().toggleBulletList().run(),  List,        "Bullet")}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered, "Numbered")}
        {btn(editor.isActive("blockquote"),  () => editor.chain().focus().toggleBlockquote().run(),  Quote,       "Quote")}
      </div>
      <div className="flex items-center gap-0.5 px-1 border-r border-[#e8e4de]">
        {btn(editor.isActive({ textAlign: "left" }),   () => editor.chain().focus().setTextAlign("left").run(),   AlignLeft,   "Left")}
        {btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), AlignCenter, "Center")}
        {btn(editor.isActive({ textAlign: "right" }),  () => editor.chain().focus().setTextAlign("right").run(),  AlignRight,  "Right")}
      </div>
      <div className="pl-1">
        <FontPicker editor={editor} />
      </div>
    </BubbleMenu>
  );
}

// ── NoteLinkPicker ────────────────────────────────────────────────────────────

function NoteLinkPicker({ editor, position, onClose }: { editor: Editor; position: PickerPos; onClose: () => void }) {
  const [query,   setQuery]   = useState("");
  const [focused, setFocused] = useState(0);
  const inputRef              = useRef<HTMLInputElement>(null);
  const notes                 = useNoteStore((s: any) => (s.notes ?? []) as any[]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = notes
    .filter((n: any) => !n.archived && (n.title || "Untitled").toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const insert = (note: any) => {
    editor.chain().focus()
      .insertContentAt(position.insertPos, { type: "noteLink", attrs: { noteId: note.id, noteTitle: note.title || "Untitled" } })
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
      <div className="fixed z-50 w-72 rounded-xl overflow-hidden shadow-2xl"
           style={{ top: position.top, left: Math.min(position.left, window.innerWidth - 300),
                    background: "rgba(10,10,10,0.96)", backdropFilter: "blur(32px) saturate(1.8)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow: "0 0 0 1px rgba(212,144,58,0.25), 0 24px 64px rgba(0,0,0,0.7)" }}>
        <div className="absolute inset-x-0 top-0 h-px"
             style={{ background: "linear-gradient(90deg,transparent,rgba(212,144,58,0.7),transparent)" }} />
        <div className="flex items-center gap-2 px-3 py-2.5"
             style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="font-mono text-xs" style={{ color: "rgba(212,144,58,0.6)" }}>{">>"}</span>
          <input ref={inputRef} value={query}
            onChange={(e) => { setQuery(e.target.value); setFocused(0); }}
            onKeyDown={onKey} placeholder="Link a note…"
            className="flex-1 bg-transparent text-xs font-sans outline-none" style={{ color: "#e8e0d5" }} />
          <span className="text-2xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>ESC cancel</span>
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0
            ? <p className="px-4 py-3 text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>No notes found</p>
            : filtered.map((note: any, i: number) => (
                <button key={note.id} onClick={() => insert(note)} onMouseEnter={() => setFocused(i)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-2 text-xs font-sans transition-colors"
                  style={{ background: i === focused ? "rgba(212,144,58,0.10)" : "transparent",
                           color: i === focused ? "#e8e0d5" : "rgba(255,255,255,0.55)" }}>
                  <span style={{ color: "rgba(212,144,58,0.5)", fontFamily: "monospace" }}>[[</span>
                  <span className="flex-1 truncate">{note.title || "Untitled"}</span>
                  <span style={{ color: "rgba(212,144,58,0.5)", fontFamily: "monospace" }}>]]</span>
                </button>
              ))
          }
        </div>
      </div>
    </>
  );
}

// ── Helpers for BlockPicker ───────────────────────────────────────────────────

function extractText(node: any): string {
  if (!node) return "";
  if (node.text) return node.text;
  if (Array.isArray(node.content)) return node.content.map(extractText).join("");
  return "";
}

// ── BlockPicker ───────────────────────────────────────────────────────────────

function BlockPicker({ editor, position, onClose }: { editor: Editor; position: PickerPos; onClose: () => void }) {
  const [step,    setStep]    = useState<"note" | "block">("note");
  const [noteId,  setNoteId]  = useState<string | null>(null);
  const [query,   setQuery]   = useState("");
  const [focused, setFocused] = useState(0);
  const inputRef              = useRef<HTMLInputElement>(null);
  const notes                 = useNoteStore((s: any) => (s.notes ?? []) as any[]);

  useEffect(() => { inputRef.current?.focus(); }, [step]);

  const sourceNote  = notes.find((n: any) => n.id === noteId);
  const blocks      = useMemo(() => {
    const doc = sourceNote?.content ?? sourceNote?.body;
    if (!doc || typeof doc === "string") return [];
    return (doc.content ?? [])
      .filter((n: any) => n.attrs?.blockId)
      .map((n: any) => ({ blockId: n.attrs.blockId, preview: extractText(n).slice(0, 70) || "Empty block", type: n.type }));
  }, [sourceNote]);

  const filteredNotes  = notes.filter((n: any) => !n.archived && (n.title || "").toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const filteredBlocks = blocks.filter((b: any) => b.preview.toLowerCase().includes(query.toLowerCase()));

  const insertBlock = (blockId: string) => {
    if (!noteId) return;
    editor.chain().focus()
      .insertContentAt(position.insertPos, { type: "syncedBlock", attrs: { sourceNoteId: noteId, blockId } })
      .run();
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const list = step === "note" ? filteredNotes : filteredBlocks;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused((f) => Math.min(f + 1, list.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocused((f) => Math.max(f - 1, 0)); }
    if (e.key === "Enter") {
      if (step === "note"  && filteredNotes[focused])  { setNoteId(filteredNotes[focused].id); setStep("block"); setQuery(""); setFocused(0); }
      if (step === "block" && filteredBlocks[focused]) { insertBlock(filteredBlocks[focused].blockId); }
    }
    if (e.key === "Backspace" && !query && step === "block") { setStep("note"); setNoteId(null); setQuery(""); }
    if (e.key === "Escape") { onClose(); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 w-80 rounded-xl overflow-hidden shadow-2xl"
           style={{ top: position.top, left: Math.min(position.left, window.innerWidth - 330),
                    background: "rgba(10,10,10,0.96)", backdropFilter: "blur(32px) saturate(1.8)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow: "0 0 0 1px rgba(212,144,58,0.2), 0 24px 64px rgba(0,0,0,0.7)" }}>
        <div className="absolute inset-x-0 top-0 h-px"
             style={{ background: "linear-gradient(90deg,transparent,rgba(212,144,58,0.6),transparent)" }} />
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-2xs font-mono" style={{ color: "rgba(212,144,58,0.5)" }}>Embed synced block</span>
          {step === "block" && sourceNote && (
            <><span className="text-2xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>›</span>
              <span className="text-2xs font-sans truncate max-w-32" style={{ color: "rgba(212,144,58,0.8)" }}>{sourceNote.title || "Untitled"}</span></>
          )}
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <input ref={inputRef} value={query}
            onChange={(e) => { setQuery(e.target.value); setFocused(0); }}
            onKeyDown={onKey}
            placeholder={step === "note" ? "Search notes…" : "Search blocks…"}
            className="flex-1 bg-transparent text-xs font-sans outline-none" style={{ color: "#e8e0d5" }} />
          {step === "block" && (
            <button onClick={() => { setStep("note"); setNoteId(null); setQuery(""); }}
              className="text-2xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>← back</button>
          )}
        </div>
        {/* List */}
        <div className="max-h-56 overflow-y-auto py-1">
          {step === "note" && (filteredNotes.length === 0
            ? <p className="px-4 py-3 text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>No notes</p>
            : filteredNotes.map((note: any, i: number) => (
                <button key={note.id}
                  onClick={() => { setNoteId(note.id); setStep("block"); setQuery(""); setFocused(0); }}
                  onMouseEnter={() => setFocused(i)}
                  className="w-full text-left px-4 py-2.5 text-xs font-sans transition-colors truncate"
                  style={{ background: i === focused ? "rgba(212,144,58,0.10)" : "transparent",
                           color: i === focused ? "#e8e0d5" : "rgba(255,255,255,0.55)" }}>
                  {note.title || "Untitled"}
                </button>))
          )}
          {step === "block" && (filteredBlocks.length === 0
            ? <p className="px-4 py-3 text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                No blocks found. Write some content in the source note first.
              </p>
            : filteredBlocks.map((block: any, i: number) => (
                <button key={block.blockId} onClick={() => insertBlock(block.blockId)} onMouseEnter={() => setFocused(i)}
                  className="w-full text-left px-4 py-2.5 transition-colors"
                  style={{ background: i === focused ? "rgba(212,144,58,0.10)" : "transparent",
                           borderLeft: i === focused ? "2px solid rgba(212,144,58,0.5)" : "2px solid transparent" }}>
                  <p className="text-xs font-sans truncate"
                     style={{ color: i === focused ? "#e8e0d5" : "rgba(255,255,255,0.55)" }}>{block.preview}</p>
                  <p className="text-2xs font-mono mt-0.5" style={{ color: "rgba(212,144,58,0.4)" }}>{block.type}</p>
                </button>))
          )}
        </div>
      </div>
    </>
  );
}

// ── BacklinksPanel ────────────────────────────────────────────────────────────

function BacklinksPanel({ noteId }: { noteId: string }) {
  const allNotes   = useNoteStore((s: any) => (s.notes ?? []) as any[]);
  const [open, setOpen] = useState(false);

  const backlinks = allNotes.filter((n: any) => {
    if (n.id === noteId || n.archived) return false;
    const json = JSON.stringify(n.content ?? n.body ?? "");
    return json.includes(`"noteId":"${noteId}"`);
  });

  if (backlinks.length === 0) return null;

  return (
    <div className="mt-8 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-mono mb-2 transition-colors"
        style={{ color: "rgba(212,144,58,0.65)" }}>
        <span>{open ? "▾" : "▸"}</span>
        <span>{backlinks.length} backlink{backlinks.length !== 1 ? "s" : ""}</span>
      </button>
      {open && (
        <div className="space-y-1 pl-3">
          {backlinks.map((note: any) => (
            <div key={note.id}
              className="text-xs font-sans truncate py-0.5"
              style={{ color: "rgba(0,0,0,0.4)" }}>
              ← {note.title || "Untitled"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SlashMenu ─────────────────────────────────────────────────────────────────

interface SlashItem { label: string; description: string; icon: LucideIcon; action: (editor: Editor) => void; }

function SlashMenu({ editor, position, onClose }: {
  editor: Editor; position: { top: number; left: number }; onClose: (openBlockPicker?: boolean) => void;
}) {
  const [query,   setQuery]   = useState("");
  const inputRef              = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const insertImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { editor.chain().focus().setImage({ src: reader.result as string }).run(); };
      reader.readAsDataURL(file);
    };
    input.click(); onClose();
  }, [editor, onClose]);

  const insertYoutube = useCallback(() => {
    const url = window.prompt("Paste YouTube URL:");
    if (url) editor.chain().focus().setYoutubeVideo({ src: url, width: 560, height: 315 }).run();
    onClose();
  }, [editor, onClose]);

  const insertLink = useCallback(() => {
    const url = window.prompt("Paste URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
    onClose();
  }, [editor, onClose]);

  const items: SlashItem[] = [
    { label: "Embed block",   description: "Embed a synced block from another note", icon: ExternalLink, action: () => onClose(true) },
    { label: "Image",         description: "Insert image from device",               icon: ImageIcon,    action: insertImage },
    { label: "YouTube",       description: "Embed a YouTube video",                  icon: YoutubeIcon,  action: insertYoutube },
    { label: "Link",          description: "Insert a hyperlink",                     icon: LinkIcon,     action: insertLink },
    { label: "Heading 1",     description: "Large heading",    icon: Heading1,    action: (ed) => { ed.chain().focus().toggleHeading({ level: 1 }).run(); onClose(); } },
    { label: "Heading 2",     description: "Medium heading",   icon: Heading2,    action: (ed) => { ed.chain().focus().toggleHeading({ level: 2 }).run(); onClose(); } },
    { label: "Heading 3",     description: "Small heading",    icon: Heading3,    action: (ed) => { ed.chain().focus().toggleHeading({ level: 3 }).run(); onClose(); } },
    { label: "Bullet list",   description: "Unordered list",   icon: List,        action: (ed) => { ed.chain().focus().toggleBulletList().run();  onClose(); } },
    { label: "Numbered list", description: "Ordered list",     icon: ListOrdered, action: (ed) => { ed.chain().focus().toggleOrderedList().run(); onClose(); } },
    { label: "Quote",         description: "Blockquote",       icon: Quote,       action: (ed) => { ed.chain().focus().toggleBlockquote().run();  onClose(); } },
    { label: "Code block",    description: "Code block",       icon: Code,        action: (ed) => { ed.chain().focus().toggleCodeBlock().run();   onClose(); } },
  ];

  const filtered = items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => onClose()} />
      <div className="fixed z-50 w-64 bg-white border border-[#e0dbd2] rounded-xl shadow-2xl overflow-hidden"
           style={{ top: position.top, left: position.left }}>
        <div className="px-3 pt-2 pb-1 border-b border-[#f0ece6]">
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
            placeholder="Search commands…"
            className="w-full text-xs font-mono bg-transparent outline-none text-gray-700 placeholder:text-gray-300" />
        </div>
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No results</p>}
          {filtered.map((item) => (
            <button key={item.label} onMouseDown={(e) => { e.preventDefault(); item.action(editor); }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#f5f2ee] transition-colors text-left">
              <div className="w-7 h-7 rounded-md bg-[#f0ece6] flex items-center justify-center shrink-0">
                <item.icon size={14} className="text-[#9a9080]" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-800">{item.label}</p>
                <p className="text-[10px] text-gray-400">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── TipTapEditor ──────────────────────────────────────────────────────────────

export const TipTapEditor = forwardRef<TipTapEditorHandle, TipTapEditorProps>(
  function TipTapEditor({ noteId, content, placeholder, onUpdate, onFocus, onBlur }, ref) {

    const [slashMenu,    setSlashMenu]    = useState<{ top: number; left: number } | null>(null);
    const [noteLinkMenu, setNoteLinkMenu] = useState<PickerPos | null>(null);
    const [blockMenu,    setBlockMenu]    = useState<PickerPos | null>(null);
    const lastPos                         = useRef<number>(0);
    const editorRef = useRef<Editor | null>(null);

    const getPickerPos = useCallback((): PickerPos => {
      // Use the editor's coordsAtPos for accurate cursor coordinates
      const view = editorRef.current?.view;
      if (view) {
        try {
          const coords = editor.view.coordsAtPos(lastPos.current);
          return { top: coords.bottom + 6, left: coords.left, insertPos: lastPos.current };
        } catch { /* fall through */ }
      }
      return { top: 200, left: 200, insertPos: lastPos.current };
    }, []);

    const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:    { levels: [1, 2, 3] },
        codeBlock:  { HTMLAttributes: { class: "noter-code-block" } },
        blockquote: { HTMLAttributes: { class: "noter-blockquote" } },
      }),
      ImageExt.configure({ inline: false, allowBase64: true }),
      Youtube.configure({ width: 560, height: 315, nocookie: true }),
      Placeholder.configure({
        placeholder:    placeholder ?? "Start writing… type / for commands, >> to link a note",
        emptyNodeClass: "noter-placeholder",
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Typography,
      Link.configure({ openOnClick: false }),
      // ── New ──────────────────
      FontFamily.configure({ types: ["textStyle"] }),
      NoteLink,
      SyncedBlock,
      BlockId,
    ],
      content,
      onFocus: () => onFocus(),
      onBlur:  () => onBlur(),
      onUpdate: ({ editor: e }) => { onUpdate(e.getJSON() as TipTapDoc); },
      editorProps: {
        attributes: { class: "prose-noter outline-none min-h-[60vh]", spellcheck: "true" },
        handleKeyDown(view, event) {
          lastPos.current = view.state.selection.from;

          // ── Slash menu ─────────────────────────────────────────
          if (event.key === "/" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
            const from = view.state.selection.from;
            setTimeout(() => {
              // coordsAtPos gives accurate viewport coordinates — window.getSelection()
              // returns an empty rect for collapsed cursors, causing top-left snapping
              try {
                const coords = view.coordsAtPos(Math.min(from + 1, view.state.doc.content.size));
                setSlashMenu({ top: coords.bottom + 6, left: coords.left });
              } catch {
                const coords = view.coordsAtPos(from);
                setSlashMenu({ top: coords.bottom + 6, left: coords.left });
              }
            }, 0);
          }

          // ── >> note link ───────────────────────────────────────
          if (event.key === ">" && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
            const { $from }  = view.state.selection;
            const textBefore = $from.nodeBefore?.text ?? "";
            if (textBefore.endsWith(">")) {
              const insertPos = $from.pos - 1;
              // Get coords BEFORE dispatch so position is still valid
              const coords = view.coordsAtPos(Math.max(insertPos, 1));
              view.dispatch(view.state.tr.delete(insertPos, $from.pos));
              setNoteLinkMenu({
                top:       coords.bottom + 6,
                left:      coords.left,
                insertPos,
              });
              return true; // prevent second ">" from inserting
            }
          }

          return false;
        },
      },
    }, [noteId]);

    // Sync content on note switch
    useEffect(() => {
      if (!editor || editor.isDestroyed) return;
      if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
        editor.commands.setContent(content);
      }
    }, [noteId]); // eslint-disable-line

    useImperativeHandle(ref, () => ({
      editor,
      getJSON: () => (editor?.getJSON() ?? content) as TipTapDoc,
      focus:   (pos = "end") => { editor?.commands.focus(pos); },
    }));

    return (
      <div className="relative">
        {editor && <BubbleToolbar editor={editor} />}

        <EditorContent editor={editor} />

        {/* Backlinks */}
        <BacklinksPanel noteId={noteId} />

        {/* Slash menu */}
        {slashMenu && editor && (
          <SlashMenu
            editor={editor}
            position={slashMenu}
            onClose={(openBlock) => {
              setSlashMenu(null);
              if (openBlock) {
                setTimeout(() => setBlockMenu(getPickerPos()), 50);
              } else {
                editor.commands.focus();
              }
            }}
          />
        )}

        {/* Note link picker */}
        {noteLinkMenu && editor && (
          <NoteLinkPicker
            editor={editor}
            position={noteLinkMenu}
            onClose={() => { setNoteLinkMenu(null); editor.commands.focus(); }}
          />
        )}

        {/* Block embed picker */}
        {blockMenu && editor && (
          <BlockPicker
            editor={editor}
            position={blockMenu}
            onClose={() => { setBlockMenu(null); editor.commands.focus(); }}
          />
        )}
      </div>
    );
  }
);