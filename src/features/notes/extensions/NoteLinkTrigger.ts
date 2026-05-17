// src/features/notes/extensions/NoteLinkTrigger.ts
import { Extension }        from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const NoteLinkTriggerKey = new PluginKey("noteLinkTrigger");

export const NoteLinkTrigger = Extension.create({
  name: "noteLinkTrigger",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: NoteLinkTriggerKey,
        props: {
          handleKeyDown(view, event) {
            // Detect ">>" typed in sequence
            if (event.key === ">") {
              const { state } = view;
              const { $from }  = state.selection;
              const textBefore = $from.nodeBefore?.text ?? "";

              if (textBefore.endsWith(">")) {
                // Delete the ">>" and open picker
                const tr = state.tr.delete($from.pos - 1, $from.pos);
                view.dispatch(tr);
                // Fire custom event — NoteLinkPicker listens for this
                window.dispatchEvent(new CustomEvent("noter:open-note-picker", {
                  detail: { pos: $from.pos - 1 }
                }));
                return true;  // consume the event
              }
            }
            return false;
          }
        }
      })
    ];
  }
});