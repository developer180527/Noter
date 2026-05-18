// src/features/notes/components/SyncedBlockView.tsx
import { NodeViewWrapper, type NodeViewProps }  from "@tiptap/react";
import { useNoteStore }     from "@/features/notes/note.store";
import { useMemo }          from "react";
import { ExternalLink }     from "lucide-react";
import type { Note, TipTapNode } from "@/features/notes/types";





// ── Simple JSX renderer for a single ProseMirror node ────────────────────────

function renderNode(node: TipTapNode | null | undefined, key: number): React.ReactNode {
  if (!node) return null;

  if (node.type === "text") {
    let el: React.ReactNode = node.text ?? "";
    const marks = node.marks ?? [];
    for (const mark of marks) {
      if (mark.type === "bold")      el = <strong key={key}>{el}</strong>;
      else if (mark.type === "italic")    el = <em      key={key}>{el}</em>;
      else if (mark.type === "code")      el = <code    key={key}>{el}</code>;
      else if (mark.type === "underline") el = <u       key={key}>{el}</u>;
      else if (mark.type === "strike")    el = <s       key={key}>{el}</s>;
    }
    return el;
  }

  const children = (node.content ?? []).map((child, i) =>
    renderNode(child, i)
  );

  switch (node.type) {
    case "paragraph":  return <p          key={key}>{children}</p>;
    case "heading":    return <b          key={key}>{children}</b>;
    case "blockquote": return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock":  return <pre        key={key}><code>{children}</code></pre>;
    default:           return <p          key={key}>{children}</p>;
  }
}

// ── SyncedBlockView ───────────────────────────────────────────────────────────

export function SyncedBlockView({ node }: NodeViewProps) {
  const sourceNoteId = typeof node.attrs.sourceNoteId === "string" ? node.attrs.sourceNoteId : "";
  const blockId = typeof node.attrs.blockId === "string" ? node.attrs.blockId : "";

  const sourceNote = useNoteStore(
    (s): Note | undefined => s.notes.find((n) => n.id === sourceNoteId)
  );

  const sourceBlock = useMemo(() => {
    const doc = sourceNote?.content ?? sourceNote?.body;
    if (!doc || typeof doc === "string") return null;
    return (doc.content ?? []).find((n) => n.attrs?.blockId === blockId) ?? null;
  }, [sourceNote?.content, sourceNote?.body, blockId]);

  const goToSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sourceNote) return;
    // Use the same custom event pattern — notes feature handles its own tab opening
    window.dispatchEvent(
      new CustomEvent("noter:open-note", {
        detail: { noteId: sourceNoteId, title: sourceNote.title || "Untitled" },
      })
    );
  };

  return (
    <NodeViewWrapper>
      <div
        className="group relative rounded-lg my-2 overflow-hidden"
        style={{
          background:  "rgba(212,144,58,0.04)",
          border:      "1px solid rgba(212,144,58,0.20)",
          borderLeft:  "3px solid rgba(212,144,58,0.45)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-1.5"
          style={{ borderBottom: "1px solid rgba(212,144,58,0.12)" }}
        >
          <span className="text-2xs font-mono" style={{ color: "rgba(212,144,58,0.55)" }}>
            synced block
            {sourceNote && (
              <>
                {" · "}
                <span style={{ color: "rgba(212,144,58,0.75)" }}>
                  {sourceNote.title || "Untitled"}
                </span>
              </>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {/* Pulse dot */}
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "rgba(212,144,58,0.5)" }}
            />
            {/* Go to source */}
            <button
              onClick={goToSource}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title="Open source note"
            >
              <ExternalLink size={10} style={{ color: "rgba(212,144,58,0.6)" }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-2.5 pointer-events-none select-text">
          {!sourceBlock ? (
            <p
              className="text-xs font-mono italic"
              style={{ color: "rgba(212,144,58,0.4)" }}
            >
              Block no longer exists in source note.
            </p>
          ) : (
            <div className="prose-noter text-sm">
              {renderNode(sourceBlock, 0)}
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
