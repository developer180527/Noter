import { NoteEditor } from "./NoteEditor";
import type { TabComponentProps } from "@/features/tabs/types";

// NoteList lives in SecondaryPanel (via kernel slot "notes.list").
// NotesPage only renders the editor — no duplicate list.
export function NotesPage(_props: TabComponentProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <NoteEditor />
    </div>
  );
}