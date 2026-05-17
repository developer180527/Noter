// src/features/notes/components/NoteLinkView.tsx
import { NodeViewWrapper } from "@tiptap/react";
import { useNoteStore }    from "@/features/notes/note.store";

export function NoteLinkView({ node }: any) {
  const { noteId, noteTitle } = node.attrs;

  // Live — if the source note's title changes this updates automatically
  const liveTitle = useNoteStore(
    (s: any) => s.notes?.find((n: any) => n.id === noteId)?.title
  );
  const title = liveTitle || noteTitle || "Untitled";

  const openNote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Dispatch a global event — the notes feature listens and opens the tab
    // using its own openTab logic with the correct component reference
    window.dispatchEvent(
      new CustomEvent("noter:open-note", { detail: { noteId, title } })
    );
  };

  return (
    <NodeViewWrapper as="span" className="inline-block align-baseline mx-0.5">
      <button
        onClick={openNote}
        contentEditable={false}
        title={`Open "${title}"`}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5
                   rounded text-xs font-mono cursor-pointer select-none
                   transition-all duration-150 no-underline"
        style={{
          background:  "rgba(212,144,58,0.10)",
          border:      "1px solid rgba(212,144,58,0.28)",
          color:       "rgba(212,144,58,0.92)",
          boxShadow:   "0 0 6px rgba(212,144,58,0.12)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow   = "0 0 14px rgba(212,144,58,0.35)";
          el.style.borderColor = "rgba(212,144,58,0.55)";
          el.style.background  = "rgba(212,144,58,0.16)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow   = "0 0 6px rgba(212,144,58,0.12)";
          el.style.borderColor = "rgba(212,144,58,0.28)";
          el.style.background  = "rgba(212,144,58,0.10)";
        }}
      >
        <span style={{ opacity: 0.45 }}>[[</span>
        {title}
        <span style={{ opacity: 0.45 }}>]]</span>
      </button>
    </NodeViewWrapper>
  );
}