// src/features/notes/extensions/BlockId.ts
import { Extension } from "@tiptap/core";
import { Plugin }    from "@tiptap/pm/state";

// Simple deterministic ID — no external dependency
function makeBlockId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const BLOCK_TYPES = ["paragraph", "heading", "blockquote", "codeBlock"];

export const BlockId = Extension.create({
  name: "blockId",

  addGlobalAttributes() {
    return [{
      types:      BLOCK_TYPES,
      attributes: {
        blockId: {
          default:    null,
          parseHTML:  (el)    => el.getAttribute("data-block-id"),
          renderHTML: (attrs) => attrs.blockId
            ? { "data-block-id": attrs.blockId }
            : {},
        },
      },
    }];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(_transactions, _oldState, newState) {
          const tr       = newState.tr;
          let   modified = false;

          newState.doc.descendants((node, pos) => {
            if (BLOCK_TYPES.includes(node.type.name) && !node.attrs.blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: makeBlockId(),
              });
              modified = true;
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});