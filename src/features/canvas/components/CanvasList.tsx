import { useState, useRef, useEffect } from "react";
import { Plus, ExternalLink, MoreHorizontal, Trash2, Pencil, Check, X } from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { useCanvasStore, type Drawing } from "../canvas.store";
import { useTabStore } from "@/features/tabs/tab.store";

// ── Three-dot context menu ────────────────────────────────────────────────────

function DrawingMenu({
  drawing,
  onClose,
  onRename,
}: {
  drawing:  Drawing;
  onClose:  () => void;
  onRename: () => void;
}) {
  const { deleteDrawing } = useCanvasStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-1 top-6 z-50 w-40 bg-overlay border border-border
                 rounded-lg shadow-2xl py-1 animate-fade-in"
    >
      <button
        onClick={() => { onRename(); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-sans
                   text-ink/80 hover:bg-raised hover:text-ink transition-colors"
      >
        <Pencil size={11} className="text-subtle" />
        Rename
      </button>
      <div className="mx-2 my-1 h-px bg-border" />
      <button
        onClick={() => {
          onClose();
          if (confirm(`Delete "${drawing.title}"? This cannot be undone.`)) {
            deleteDrawing(drawing.id);
          }
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-sans
                   text-danger hover:bg-danger/10 transition-colors"
      >
        <Trash2 size={11} />
        Delete
      </button>
    </div>
  );
}

// ── Drawing card ──────────────────────────────────────────────────────────────

function DrawingCard({ drawing, isActive }: { drawing: Drawing; isActive: boolean }) {
  const { setActiveDrawing, renameDrawing } = useCanvasStore();
  const { openTab } = useTabStore();

  const [renaming,  setRenaming]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [title,     setTitle]     = useState(drawing.title);
  const [hovered,   setHovered]   = useState(false);

  const commitRename = () => {
    if (title.trim()) renameDrawing(drawing.id, title.trim());
    else setTitle(drawing.title);
    setRenaming(false);
  };

  const openStandalone = (e: React.MouseEvent) => {
    e.stopPropagation();
    openTab({
      id:        `canvas-${drawing.id}`,
      title:     drawing.title,
      component: () => null,
      props:     { _componentKey: "canvas-page" },
      closeable: true,
      pinned:    false,
    });
  };

  return (
    <div
      onClick={() => !renaming && setActiveDrawing(drawing.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      className={clsx(
        "relative group w-full text-left px-3 py-2.5 border-b border-border",
        "transition-colors cursor-pointer hover:bg-raised/70 border-l-2",
        isActive ? "bg-raised border-l-amber" : "border-l-transparent"
      )}
    >
      {/* Title row */}
      <div className="flex items-center gap-1 min-h-[20px]">
        {renaming ? (
          <div
            className="flex items-center gap-1 flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  commitRename();
                if (e.key === "Escape") { setTitle(drawing.title); setRenaming(false); }
              }}
              className="flex-1 text-xs font-sans bg-overlay border border-amber/50
                         rounded px-1.5 py-0.5 outline-none text-ink"
            />
            <button onClick={commitRename}
              className="p-0.5 text-success hover:text-success/80 shrink-0">
              <Check size={10} />
            </button>
            <button onClick={() => { setTitle(drawing.title); setRenaming(false); }}
              className="p-0.5 text-subtle hover:text-ink shrink-0">
              <X size={10} />
            </button>
          </div>
        ) : (
          <>
            <span className={clsx(
              "text-xs font-sans font-medium truncate flex-1",
              isActive ? "text-ink" : "text-ink/80"
            )}>
              {drawing.title}
            </span>

            {/* Action buttons — visible on hover */}
            {(hovered || menuOpen) && (
              <div
                className="flex items-center gap-0.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Open in standalone tab */}
                <button
                  onClick={openStandalone}
                  title="Open in new tab"
                  className="p-1 rounded text-subtle hover:text-ink hover:bg-raised
                             transition-colors"
                >
                  <ExternalLink size={10} />
                </button>

                {/* Three-dot menu */}
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                  title="More options"
                  className={clsx(
                    "p-1 rounded transition-colors",
                    menuOpen
                      ? "bg-raised text-ink"
                      : "text-subtle hover:text-ink hover:bg-raised"
                  )}
                >
                  <MoreHorizontal size={11} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Timestamp */}
      {!renaming && (
        <p className="text-2xs text-subtle font-mono mt-0.5">
          {formatDistanceToNow(drawing.updatedAt, { addSuffix: false })}
        </p>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <DrawingMenu
          drawing={drawing}
          onClose={() => setMenuOpen(false)}
          onRename={() => { setRenaming(true); setTitle(drawing.title); }}
        />
      )}
    </div>
  );
}

// ── Canvas List ───────────────────────────────────────────────────────────────

export function CanvasList() {
  const { drawings, activeDrawingId, createDrawing } = useCanvasStore();

  return (
    <div className="flex flex-col h-full bg-surface w-56 shrink-0">
      <div className="flex items-center justify-between px-3 py-2
                      border-b border-border shrink-0">
        <span className="text-2xs font-mono uppercase tracking-widest text-subtle">
          Drawings
        </span>
        <button
          onClick={() => createDrawing()}
          className="p-1 rounded text-muted hover:text-amber hover:bg-amber/10
                     transition-colors"
          title="New drawing"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {drawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2
                          px-4 text-center">
            <p className="text-xs text-subtle font-sans">No drawings yet.</p>
            <button
              onClick={() => createDrawing()}
              className="text-xs text-amber hover:text-amber-glow font-sans
                         transition-colors"
            >
              + Create one
            </button>
          </div>
        ) : (
          drawings.map((d) => (
            <DrawingCard
              key={d.id}
              drawing={d}
              isActive={d.id === activeDrawingId}
            />
          ))
        )}
      </div>
    </div>
  );
}