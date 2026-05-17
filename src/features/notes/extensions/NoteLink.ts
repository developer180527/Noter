// src/features/notes/extensions/NoteLink.ts
import { Node, mergeAttributes }     from "@tiptap/core";
import { ReactNodeViewRenderer }     from "@tiptap/react";
import { NoteLinkView }              from "../components/NoteLinkView";

export const NoteLink = Node.create({
  name:     "noteLink",
  group:    "inline",
  inline:   true,
  atom:     true,
  selectable: true,
  draggable:  false,

  addAttributes() {
    return {
      noteId:    { default: null },
      noteTitle: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-note-link]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-note-link": "" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteLinkView);
  },
});