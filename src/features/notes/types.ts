export interface Note {
  id: string;
  title: string;
  body: string;           // Raw markdown / plain text
  tags: string[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  archived: boolean;
  color?: NoteColor;
}

export type NoteColor = "none" | "amber" | "red" | "green" | "blue";

export interface NoteFilter {
  search: string;
  tag: string | null;
  archived: boolean;
}

export interface NoteState {
  notes: Note[];
  activeNoteId: string | null;
  filter: NoteFilter;
}

export interface NoteActions {
  createNote(partial?: Partial<Omit<Note, "id" | "createdAt" | "updatedAt">>): string;
  updateNote(id: string, patch: Partial<Omit<Note, "id" | "createdAt">>): void;
  deleteNote(id: string): void;
  setActiveNote(id: string | null): void;
  pinNote(id: string, pinned: boolean): void;
  archiveNote(id: string, archived: boolean): void;
  setFilter(patch: Partial<NoteFilter>): void;
  filteredNotes(): Note[];
  allTags(): string[];
}

export type NoteStore = NoteState & NoteActions;
