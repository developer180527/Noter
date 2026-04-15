import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { useTabStore } from "@/features/tabs/tab.store";

export interface Drawing {
  id:          string;
  title:       string;
  createdAt:   number;
  updatedAt:   number;
  // Excalidraw data stored as serialised JSON string to avoid Immer issues
  elements:    string;   // JSON.stringify(ExcalidrawElement[])
  appState:    string;   // JSON.stringify(partial AppState)
}

interface CanvasState {
  drawings:       Drawing[];
  activeDrawingId: string | null;
}

interface CanvasActions {
  createDrawing(title?: string): string;
  updateDrawing(id: string, data: { elements: string; appState: string }): void;
  renameDrawing(id: string, title: string): void;
  deleteDrawing(id: string): void;
  setActiveDrawing(id: string | null): void;
}

export type CanvasStore = CanvasState & CanvasActions;

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set) => ({
      drawings:        [],
      activeDrawingId: null,

      createDrawing(title = "Untitled Drawing") {
        const id  = nanoid(10);
        const now = Date.now();
        const drawing: Drawing = {
          id, title,
          createdAt: now, updatedAt: now,
          elements:  "[]",
          appState:  JSON.stringify({ theme: "dark", viewBackgroundColor: "#0d0d0d" }),
        };
        set((s) => ({ drawings: [drawing, ...s.drawings], activeDrawingId: id }));
        return id;
      },

      updateDrawing(id, { elements, appState }) {
        set((s) => ({
          drawings: s.drawings.map((d) =>
            d.id === id ? { ...d, elements, appState, updatedAt: Date.now() } : d
          ),
        }));
      },

      renameDrawing(id, title) {
        set((s) => ({
          drawings: s.drawings.map((d) =>
            d.id === id ? { ...d, title, updatedAt: Date.now() } : d
          ),
        }));
        // Sync the standalone tab title if this drawing is open in its own tab
        const tabStore = useTabStore.getState();
        const standaloneTabId = `canvas-${id}`;
        if (tabStore.tabs.some((t) => t.id === standaloneTabId)) {
          tabStore.updateTab(standaloneTabId, { title });
        }
      },

      deleteDrawing(id) {
        set((s) => ({
          drawings: s.drawings.filter((d) => d.id !== id),
          activeDrawingId: s.activeDrawingId === id
            ? (s.drawings.find((d) => d.id !== id)?.id ?? null)
            : s.activeDrawingId,
        }));
      },

      setActiveDrawing(id) {
        set({ activeDrawingId: id });
      },
    }),
    {
      name: "noter:canvas-v1",
      partialize: (s) => ({ drawings: s.drawings, activeDrawingId: s.activeDrawingId }),
    }
  )
);