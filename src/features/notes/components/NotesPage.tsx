import { NoteList } from "./NoteList";
import { NoteEditor } from "./NoteEditor";
import type { TabComponentProps } from "@/features/tabs/types";

export function NotesPage(_props: TabComponentProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <NoteList />
      <NoteEditor />
    </div>
  );
}
