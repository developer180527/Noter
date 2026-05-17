// src/features/notes/extensions/SyncedBlock.ts
import { Node, mergeAttributes }  from "@tiptap/core";
import { ReactNodeViewRenderer }  from "@tiptap/react";
import { SyncedBlockView }        from "../components/SyncedBlockView";

export const SyncedBlock = Node.create({
  name:     "syncedBlock",
  group:    "block",
  atom:     true,
  draggable: true,

  addAttributes() {
    return {
      sourceNoteId: { default: null },
      blockId:      { default: null },
    };
  },

  parseHTML()  { return [{ tag: "div[data-synced-block]" }]; },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-synced-block": "" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SyncedBlockView);
  },
});