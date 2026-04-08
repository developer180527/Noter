import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import type { Editor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code,
  AlignLeft, AlignCenter, AlignRight, Highlighter,
  ImageIcon, Youtube as YoutubeIcon, Link as LinkIcon,
} from "lucide-react";
import { clsx } from "clsx";
import type { TipTapDoc } from "../types";

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

// ── Bubble toolbar ────────────────────────────────────────────────────────────

function BubbleToolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean, onClick: () => void, Icon: LucideIcon, title: string) => (
    <button
      key={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={clsx(
        "p-1.5 rounded transition-colors",
        active ? "bg-amber/20 text-[#8a5c1f]" : "text-[#666] hover:bg-[#e8e4de] hover:text-[#222]"
      )}
    >
      <Icon size={13} />
    </button>
  );

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 bg-white border border-[#e0dbd2]
                 rounded-lg shadow-xl px-1.5 py-1 z-50"
    >
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
      <div className="flex items-center gap-0.5 pl-1">
        {btn(editor.isActive({ textAlign: "left" }),   () => editor.chain().focus().setTextAlign("left").run(),   AlignLeft,   "Left")}
        {btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), AlignCenter, "Center")}
        {btn(editor.isActive({ textAlign: "right" }),  () => editor.chain().focus().setTextAlign("right").run(),  AlignRight,  "Right")}
      </div>
    </BubbleMenu>
  );
}

// ── Slash command menu ────────────────────────────────────────────────────────

interface SlashItem {
  label:       string;
  description: string;
  icon:        LucideIcon;
  action:      (editor: Editor) => void;
}

function SlashMenu({
  editor,
  position,
  onClose,
}: {
  editor:   Editor;
  position: { top: number; left: number };
  onClose:  () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const insertImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
    onClose();
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
    { label: "Image",        description: "Insert image from device",    icon: ImageIcon,   action: insertImage },
    { label: "YouTube",      description: "Embed a YouTube video",        icon: YoutubeIcon, action: insertYoutube },
    { label: "Link",         description: "Insert a hyperlink",           icon: LinkIcon,    action: insertLink },
    { label: "Heading 1",    description: "Large heading",                icon: Heading1,    action: (ed) => { ed.chain().focus().toggleHeading({ level: 1 }).run(); onClose(); } },
    { label: "Heading 2",    description: "Medium heading",               icon: Heading2,    action: (ed) => { ed.chain().focus().toggleHeading({ level: 2 }).run(); onClose(); } },
    { label: "Heading 3",    description: "Small heading",                icon: Heading3,    action: (ed) => { ed.chain().focus().toggleHeading({ level: 3 }).run(); onClose(); } },
    { label: "Bullet list",  description: "Unordered list",               icon: List,        action: (ed) => { ed.chain().focus().toggleBulletList().run();  onClose(); } },
    { label: "Numbered list",description: "Ordered list",                 icon: ListOrdered, action: (ed) => { ed.chain().focus().toggleOrderedList().run(); onClose(); } },
    { label: "Quote",        description: "Blockquote",                   icon: Quote,       action: (ed) => { ed.chain().focus().toggleBlockquote().run();  onClose(); } },
    { label: "Code block",   description: "Monospace code block",         icon: Code,        action: (ed) => { ed.chain().focus().toggleCodeBlock().run();   onClose(); } },
  ];

  const filtered = items.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-64 bg-white border border-[#e0dbd2]
                   rounded-xl shadow-2xl overflow-hidden"
        style={{ top: position.top, left: position.left }}
      >
        <div className="px-3 pt-2 pb-1 border-b border-[#f0ece6]">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
            placeholder="Search commands…"
            className="w-full text-xs font-mono bg-transparent outline-none
                       text-gray-700 placeholder:text-gray-300"
          />
        </div>
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">No results</p>
          )}
          {filtered.map((item) => (
            <button
              key={item.label}
              onMouseDown={(e) => { e.preventDefault(); item.action(editor); }}
              className="w-full flex items-center gap-3 px-3 py-2
                         hover:bg-[#f5f2ee] transition-colors text-left"
            >
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
    const [slashMenu, setSlashMenu] = useState<{ top: number; left: number } | null>(null);

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
          placeholder:    placeholder ?? "Start writing… type / for commands",
          emptyNodeClass: "noter-placeholder",
        }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Underline,
        Highlight.configure({ multicolor: false }),
        Typography,
        Link.configure({ openOnClick: false }),
      ],
      content,
      onFocus: () => onFocus(),
      onBlur:  () => onBlur(),
      onUpdate: ({ editor: e }) => {
        onUpdate(e.getJSON() as TipTapDoc);
      },
      editorProps: {
        attributes: {
          class:     "prose-noter outline-none min-h-[60vh]",
          spellcheck: "true",
        },
        handleKeyDown(_view, event) {
          if (event.key === "/" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
            setTimeout(() => {
              const sel = window.getSelection();
              if (!sel?.rangeCount) return;
              const rect = sel.getRangeAt(0).getBoundingClientRect();
              setSlashMenu({ top: rect.bottom + 6, left: rect.left });
            }, 0);
          }
          return false;
        },
      },
    }, [noteId]);

    // Sync content when note changes
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
        {slashMenu && editor && (
          <SlashMenu
            editor={editor}
            position={slashMenu}
            onClose={() => { setSlashMenu(null); editor.commands.focus(); }}
          />
        )}
      </div>
    );
  }
);