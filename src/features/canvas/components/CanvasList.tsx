import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { useCanvasStore, type Drawing } from "../canvas.store";

function DrawingCard({ drawing, isActive }: { drawing: Drawing; isActive: boolean }) {
  const { setActiveDrawing, deleteDrawing, renameDrawing } = useCanvasStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle]     = useState(drawing.title);

  const commitRename = () => {
    if (title.trim()) renameDrawing(drawing.id, title.trim());
    else setTitle(drawing.title);
    setEditing(false);
  };

  return (
    <div
      onClick={() => !editing && setActiveDrawing(drawing.id)}
      className={clsx(
        "group w-full text-left px-3 py-2.5 border-b border-border transition-colors cursor-pointer",
        "hover:bg-raised/70 border-l-2",
        isActive ? "bg-raised border-l-amber" : "border-l-transparent"
      )}
    >
      <div className="flex items-center justify-between gap-2 min-h-[20px]">
        {editing ? (
          <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setTitle(drawing.title); setEditing(false); }
              }}
              className="flex-1 text-xs font-sans bg-overlay border border-amber/50 rounded
                         px-1.5 py-0.5 outline-none text-ink"
            />
            <button onClick={commitRename} className="p-0.5 text-success hover:text-success/80">
              <Check size={10} />
            </button>
            <button onClick={() => { setTitle(drawing.title); setEditing(false); }}
              className="p-0.5 text-subtle hover:text-ink">
              <X size={10} />
            </button>
          </div>
        ) : (
          <>
            <span className={clsx("text-xs font-sans font-medium truncate flex-1",
              isActive ? "text-ink" : "text-ink/80")}>
              {drawing.title}
            </span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                className="p-0.5 rounded text-subtle hover:text-ink transition-colors"
              >
                <Pencil size={9} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${drawing.title}"?`)) deleteDrawing(drawing.id);
                }}
                className="p-0.5 rounded text-subtle hover:text-danger transition-colors"
              >
                <Trash2 size={9} />
              </button>
            </div>
          </>
        )}
      </div>
      {!editing && (
        <p className="text-2xs text-subtle font-mono mt-0.5">
          {formatDistanceToNow(drawing.updatedAt, { addSuffix: false })}
        </p>
      )}
    </div>
  );
}

export function CanvasList() {
  const { drawings, activeDrawingId, createDrawing } = useCanvasStore();

  return (
    <div className="flex flex-col h-full bg-surface w-56 shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-2xs font-mono uppercase tracking-widest text-subtle">Drawings</span>
        <button
          onClick={() => createDrawing()}
          className="p-1 rounded text-muted hover:text-amber hover:bg-amber/10 transition-colors"
          title="New drawing"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {drawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <p className="text-xs text-subtle font-sans">No drawings yet.</p>
            <button onClick={() => createDrawing()}
              className="text-xs text-amber hover:text-amber-glow font-sans transition-colors">
              + Create one
            </button>
          </div>
        ) : (
          drawings.map((d) => (
            <DrawingCard key={d.id} drawing={d} isActive={d.id === activeDrawingId} />
          ))
        )}
      </div>
    </div>
  );
}
