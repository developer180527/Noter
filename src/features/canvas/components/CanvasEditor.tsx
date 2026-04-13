import { useEffect, useRef, useCallback, useState, lazy, Suspense } from "react";
import { Link, FileText } from "lucide-react";
import { useCanvasStore } from "../canvas.store";
import { useNoteStore } from "@/features/notes/note.store";
import { useTabStore } from "@/features/tabs/tab.store";
import { NOTES_TAB_ID } from "@/features/notes";
import type { Note } from "@/features/notes/types";

// Lazy-load Excalidraw — it's large, only load when canvas tab is opened
const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw }))
);

// ── Note picker modal ─────────────────────────────────────────────────────────

function NotePicker({ onPick, onClose }: {
  onPick: (note: Note) => void;
  onClose: () => void;
}) {
  const { notes } = useNoteStore();
  const [search, setSearch] = useState("");
  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-80 bg-overlay border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="px-3 py-2 border-b border-border">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full text-xs font-sans bg-transparent outline-none text-ink placeholder:text-subtle"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-3 py-3 text-xs text-subtle">No notes found.</p>
          )}
          {filtered.map((note) => (
            <button
              key={note.id}
              onClick={() => { onPick(note); onClose(); }}
              className="w-full text-left px-3 py-2 hover:bg-raised transition-colors flex items-center gap-2"
            >
              <FileText size={11} className="text-amber shrink-0" />
              <span className="text-xs font-sans text-ink truncate">{note.title || "Untitled"}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Canvas Editor ─────────────────────────────────────────────────────────────

export function CanvasEditor() {
  const { drawings, activeDrawingId, updateDrawing } = useCanvasStore();
  const { setActiveNote }  = useNoteStore();
  const { setActiveTab }   = useTabStore();
  const drawing = drawings.find((d) => d.id === activeDrawingId);

  const excalidrawRef = useRef<any>(null);
  const saveTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPicker,  setShowPicker]  = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Reset initialized flag when drawing changes
  useEffect(() => { setInitialized(false); }, [activeDrawingId]);

  const handleChange = useCallback((elements: any[], appState: any) => {
    if (!activeDrawingId || !initialized) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateDrawing(activeDrawingId, {
        elements: JSON.stringify(elements),
        appState: JSON.stringify({
          theme:                 appState.theme,
          viewBackgroundColor:   appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
          gridSize:              appState.gridSize,
          zoom:                  appState.zoom,
          scrollX:               appState.scrollX,
          scrollY:               appState.scrollY,
        }),
      });
    }, 800);
  }, [activeDrawingId, updateDrawing, initialized]);

  // Insert a note reference card into the canvas
  const insertNoteRef = useCallback((note: Note) => {
    if (!excalidrawRef.current) return;
    const api = excalidrawRef.current;
    const elements = api.getSceneElements() ?? [];
    const { x = 0, y = 0 } = api.getAppState?.() ?? {};

    const id = Math.random().toString(36).slice(2);
    const noteCard = {
      type:           "rectangle",
      version:        1,
      versionNonce:   Math.random(),
      isDeleted:      false,
      id,
      fillStyle:      "solid",
      strokeWidth:    1,
      strokeStyle:    "solid",
      roughness:      0,
      opacity:        100,
      angle:          0,
      x:              -x + 100,
      y:              -y + 100,
      strokeColor:    "#d4903a",
      backgroundColor: "#1a1a1a",
      width:          200,
      height:         80,
      seed:           Math.floor(Math.random() * 10000),
      groupIds:       [],
      roundness:      { type: 3 },
      boundElements:  null,
      updated:        Date.now(),
      link:           `noter://note/${note.id}`,
      locked:         false,
      customData:     { type: "noter:note-ref", noteId: note.id, title: note.title },
    };

    const label = {
      type:           "text",
      version:        1,
      versionNonce:   Math.random(),
      isDeleted:      false,
      id:             Math.random().toString(36).slice(2),
      fillStyle:      "solid",
      strokeWidth:    1,
      strokeStyle:    "solid",
      roughness:      0,
      opacity:        100,
      angle:          0,
      x:              -x + 110,
      y:              -y + 115,
      strokeColor:    "#e8e0d5",
      backgroundColor: "transparent",
      width:          180,
      height:         50,
      seed:           Math.floor(Math.random() * 10000),
      groupIds:       [],
      roundness:      null,
      boundElements:  null,
      updated:        Date.now(),
      link:           null,
      locked:         false,
      fontSize:       14,
      fontFamily:     1,
      text:           `📄 ${note.title || "Untitled"}`,
      textAlign:      "left",
      verticalAlign:  "middle",
      containerId:    null,
      originalText:   `📄 ${note.title || "Untitled"}`,
      lineHeight:     1.4,
    };

    api.updateScene({ elements: [...elements, noteCard, label] });
  }, []);

  // Handle double-click on note-ref elements
  const handleLinkOpen = useCallback((element: any, event: any) => {
    if (element?.customData?.type === "noter:note-ref") {
      event?.preventDefault?.();
      const noteId = element.customData.noteId;
      setActiveNote(noteId);
      setActiveTab(NOTES_TAB_ID);
    }
  }, [setActiveNote, setActiveTab]);

  if (!drawing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-base">
        <div className="text-center space-y-3">
          <p className="font-serif italic text-5xl text-muted/20 select-none">✏️</p>
          <p className="text-xs text-subtle font-sans">Select or create a drawing</p>
        </div>
      </div>
    );
  }

  let initialElements: any[] = [];
  let initialAppState: any   = { theme: "dark", viewBackgroundColor: "#0d0d0d" };

  try { initialElements = JSON.parse(drawing.elements); } catch { /* empty */ }
  try { initialAppState = { ...initialAppState, ...JSON.parse(drawing.appState) }; } catch { /* empty */ }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Toolbar overlay */}
      <div className="absolute top-2 right-3 z-10 flex items-center gap-1.5">
        <button
          onClick={() => setShowPicker(true)}
          title="Insert note reference"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                     bg-overlay/90 border border-border text-xs font-sans text-subtle
                     hover:text-ink hover:bg-raised transition-colors backdrop-blur-sm"
        >
          <Link size={11} />
          <span>Link note</span>
        </button>
      </div>

      {/* Excalidraw */}
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center bg-base">
          <p className="text-xs text-subtle font-mono animate-pulse">Loading canvas…</p>
        </div>
      }>
        <Excalidraw
          key={drawing.id}
          excalidrawAPI={(api) => { excalidrawRef.current = api; }}
          initialData={{ elements: initialElements, appState: initialAppState }}
          onChange={(elements, appState) => {
            if (!initialized) { setInitialized(true); return; }
            handleChange(elements as any[], appState as any);
          }}
          onLinkOpen={handleLinkOpen}
          theme="dark"
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene:        false,
              export:           false,
              toggleTheme:      false,
            },
          }}
        />
      </Suspense>

      {showPicker && (
        <NotePicker
          onPick={insertNoteRef}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
