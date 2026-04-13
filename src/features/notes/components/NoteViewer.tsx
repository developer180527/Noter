// ─────────────────────────────────────────────────────────────────────────────
// NoteViewer — renders a single note in its own tab.
// Opened when user clicks "Open in tab" on a note card.
// Props come from the tab: { noteId: string }
// ─────────────────────────────────────────────────────────────────────────────

import { SingleEditor } from "./NoteEditor";
import type { TabComponentProps } from "@/features/tabs/types";

interface NoteViewerProps extends TabComponentProps {
  noteId?: string;
}

export function NoteViewer({ noteId }: NoteViewerProps) {
  if (!noteId) return (
    <div className="flex-1 flex items-center justify-center bg-surface">
      <p className="text-xs text-subtle font-sans">No note selected</p>
    </div>
  );
  return (
    <div className="flex h-full w-full overflow-hidden">
      <SingleEditor noteId={noteId} />
    </div>
  );
}