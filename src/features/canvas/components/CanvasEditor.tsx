import { useEffect, useRef, useCallback, useState, lazy, Suspense } from "react";
import { Link, FileText, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { MainMenu } from "@excalidraw/excalidraw";
import { useCanvasStore } from "../canvas.store";
import { useNoteStore } from "@/features/notes/note.store";
import { useTabStore } from "@/features/tabs/tab.store";
import { NOTES_TAB_ID } from "@/features/notes";
import type { Note } from "@/features/notes/types";

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw }))
);

// ── Note picker modal ─────────────────────────────────────────────────────────

function NotePicker({ onPick, onClose }: {
  onPick: (note: Note) => void;
  onClose: () => void;
}) {
  const { notes }  = useNoteStore();
  const [search, setSearch] = useState("");
  const filtered = notes
    .filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 20);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-80 bg-overlay border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full text-xs font-sans bg-transparent outline-none
                       text-ink placeholder:text-subtle"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-3 py-3 text-xs text-subtle">No notes found.</p>
          )}
          {filtered.map((note) => (
            <button key={note.id} onClick={() => { onPick(note); onClose(); }}
              className="w-full text-left px-3 py-2 hover:bg-raised transition-colors
                         flex items-center gap-2">
              <FileText size={11} className="text-amber shrink-0" />
              <span className="text-xs font-sans text-ink truncate">
                {note.title || "Untitled"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Canvas Editor ─────────────────────────────────────────────────────────────

interface CanvasEditorProps {
  sidebarOpen:    boolean;
  onToggleSidebar: () => void;
}

export function CanvasEditor({ sidebarOpen, onToggleSidebar }: CanvasEditorProps) {
  const { drawings, activeDrawingId, updateDrawing } = useCanvasStore();
  const { setActiveNote } = useNoteStore();
  const { setActiveTab }  = useTabStore();
  const drawing = drawings.find((d) => d.id === activeDrawingId);

  const excalidrawRef  = useRef<any>(null);
  const saveTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPicker,   setShowPicker]   = useState(false);
  const [initialized,  setInitialized]  = useState(false);

  useEffect(() => { setInitialized(false); }, [activeDrawingId]);

  const handleChange = useCallback((elements: any[], appState: any) => {
    if (!activeDrawingId || !initialized) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateDrawing(activeDrawingId, {
        elements: JSON.stringify(elements),
        appState: JSON.stringify({
          theme:               appState.theme,
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize:            appState.gridSize,
          zoom:                appState.zoom,
          scrollX:             appState.scrollX,
          scrollY:             appState.scrollY,
        }),
      });
    }, 800);
  }, [activeDrawingId, updateDrawing, initialized]);

  // Insert a note-ref card — text properly bound to rectangle via containerId
  const insertNoteRef = useCallback((note: Note) => {
    const api = excalidrawRef.current;
    if (!api) return;

    const elements  = [...(api.getSceneElements() ?? [])];
    const appState  = api.getAppState?.() ?? {};
    const cx = (appState.width  ?? 800) / 2 - (appState.scrollX ?? 0);
    const cy = (appState.height ?? 600) / 2 - (appState.scrollY ?? 0);
    const seed = Math.floor(Math.random() * 100000);

    const rectId = `noter-ref-${note.id}-${Date.now()}`;
    const textId = `noter-text-${note.id}-${Date.now()}`;

    const rect: any = {
      type:            "rectangle",
      version:         1, versionNonce: seed,
      isDeleted:       false,
      id:              rectId,
      fillStyle:       "solid",
      strokeWidth:     1.5,
      strokeStyle:     "solid",
      roughness:       0,
      opacity:         100,
      angle:           0,
      x: cx - 100, y: cy - 35,
      width: 200, height: 70,
      strokeColor:     "#d4903a",
      backgroundColor: "#1a1208",
      seed,
      groupIds:        [],
      roundness:       { type: 3 },
      boundElements:   [{ type: "text", id: textId }],
      updated:         Date.now(),
      link:            `noter://note/${note.id}`,
      locked:          false,
      customData:      { type: "noter:note-ref", noteId: note.id, title: note.title },
    };

    const text: any = {
      type:            "text",
      version:         1, versionNonce: seed + 1,
      isDeleted:       false,
      id:              textId,
      fillStyle:       "solid",
      strokeWidth:     1,
      strokeStyle:     "solid",
      roughness:       0,
      opacity:         100,
      angle:           0,
      x: cx - 95, y: cy - 17,
      width: 190, height: 34,
      strokeColor:     "#d4903a",
      backgroundColor: "transparent",
      seed:            seed + 1,
      groupIds:        [],
      roundness:       null,
      boundElements:   null,
      updated:         Date.now(),
      link:            null,
      locked:          false,
      fontSize:        14,
      fontFamily:      1,
      text:            `📄 ${note.title || "Untitled"}`,
      textAlign:       "center",
      verticalAlign:   "middle",
      containerId:     rectId,   // ← binds text to rect, moves together
      originalText:    `📄 ${note.title || "Untitled"}`,
      lineHeight:      1.4,
    };

    api.updateScene({ elements: [...elements, rect, text] });
    api.scrollToContent(rect, { animate: true, fitToContent: false });
  }, []);

  const handleLinkOpen = useCallback((element: any, event: any) => {
    if (element?.customData?.type === "noter:note-ref") {
      event?.preventDefault?.();
      setActiveNote(element.customData.noteId);
      setActiveTab(NOTES_TAB_ID);
    }
  }, [setActiveNote, setActiveTab]);

  if (!drawing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-base">
        <div className="text-center space-y-3">
          <p className="text-4xl select-none">✏️</p>
          <p className="text-xs text-subtle font-sans">Select or create a drawing</p>
        </div>
      </div>
    );
  }

  let initialElements: any[] = [];
  let initialAppState: any   = {
    theme:               "dark",
    viewBackgroundColor: "#0d0d0d",
  };
  try { initialElements = JSON.parse(drawing.elements); }  catch { /**/ }
  try { initialAppState = { ...initialAppState, ...JSON.parse(drawing.appState) }; } catch { /**/ }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
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
              saveAsImage:      false,
              export:           false,
              toggleTheme:      false,
              changeViewBackgroundColor: false,
            },
          }}
          renderTopRightUI={() => (
            <button
              onClick={() => setShowPicker(true)}
              title="Insert note reference"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                         bg-[#1a1a1a] border border-[#2a2a2a] text-xs font-sans
                         text-[#9a9390] hover:text-[#e8e0d5] hover:bg-[#222]
                         transition-colors"
            >
              <Link size={11} />
              <span>Link note</span>
            </button>
          )}
        >
          {/* Sidebar toggle — positioned in the toolbar row */}
          <div
            style={{
              position: "absolute",
              top:      "0.625rem",   // aligns with toolbar height
              left:     "3.25rem",    // right of the hamburger menu
              zIndex:   10,
            }}
          >
            <button
              onClick={onToggleSidebar}
              title={sidebarOpen ? "Hide drawings panel" : "Show drawings panel"}
              style={{
                width:           "2rem",
                height:          "2rem",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                borderRadius:    "0.5rem",
                background:      sidebarOpen ? "rgba(212,144,58,0.15)" : "transparent",
                border:          "none",
                color:           sidebarOpen ? "#d4903a" : "#9a9390",
                cursor:          "pointer",
                transition:      "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!sidebarOpen) {
                  (e.currentTarget as HTMLElement).style.background = "#1a1a1a";
                  (e.currentTarget as HTMLElement).style.color = "#e8e0d5";
                }
              }}
              onMouseLeave={(e) => {
                if (!sidebarOpen) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#9a9390";
                }
              }}
            >
              {sidebarOpen
                ? <PanelLeftClose size={15} />
                : <PanelLeftOpen  size={15} />
              }
            </button>
          </div>

          {/* Custom MainMenu — removes Excalidraw branding */}
          <MainMenu>
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.SearchMenu />
            <MainMenu.DefaultItems.CommandPalette />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.Help />
          </MainMenu>
        </Excalidraw>
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