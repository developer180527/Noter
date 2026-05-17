// src/features/notes/extensions/CollapsibleHeadings.ts
//
// Pure Extension — never touches heading Node definition.
// StarterKit heading works exactly as before.
// Collapsed state is stored in plugin state (a Set of keys), NOT in the document.
// Content hidden via CSS class injected by Decoration.node().

import { Extension }         from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const KEY = new PluginKey<Set<string>>("collapsibleHeadings");

// Stable string key for a heading based on its position + level + text
function hKey(offset: number, node: any): string {
  return `${node.attrs.level}::${offset}::${(node.textContent as string).slice(0, 40)}`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

function injectCSS() {
  const id = "noter-collapse-css";
  if (document.getElementById(id)) return;
  const s   = document.createElement("style");
  s.id      = id;
  s.textContent = `
    .noter-collapsed-content {
      display: none !important;
    }
    .noter-collapse-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      margin-right: 4px;
      border: none;
      border-radius: 3px;
      background: transparent;
      cursor: pointer;
      color: rgba(150,140,130,0.35);
      vertical-align: middle;
      padding: 0;
      position: relative;
      top: -1px;
      flex-shrink: 0;
      transition: color 100ms, background 100ms;
      user-select: none;
    }
    .noter-collapse-btn:hover {
      color: rgba(212,144,58,0.9);
      background: rgba(212,144,58,0.1);
    }
  `;
  document.head.appendChild(s);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTopLevelChildren(doc: any): Array<{ node: any; offset: number }> {
  const out: Array<{ node: any; offset: number }> = [];
  doc.forEach((node: any, offset: number) => out.push({ node, offset }));
  return out;
}

// Does this heading have any content beneath it (before next same-level heading)?
function hasContent(children: Array<{ node: any; offset: number }>, idx: number, level: number): boolean {
  for (let i = idx + 1; i < children.length; i++) {
    const { node } = children[i];
    if (node.type.name === "heading" && node.attrs.level <= level) return false;
    return true;
  }
  return false;
}

// ── Build decorations ─────────────────────────────────────────────────────────

function buildDecs(
  doc:       any,
  collapsed: Set<string>,
  viewRef:   { current: any },
): DecorationSet {
  const decs: Decoration[] = [];
  const children           = getTopLevelChildren(doc);
  const stack: number[]    = []; // active collapsed heading levels

  for (let i = 0; i < children.length; i++) {
    const { node, offset } = children[i];

    if (node.type.name !== "heading") {
      // Hide if inside a collapsed section
      if (stack.length > 0) {
        decs.push(Decoration.node(offset, offset + node.nodeSize, {
          class: "noter-collapsed-content",
        }));
      }
      continue;
    }

    const level = node.attrs.level as number;
    const key   = hKey(offset, node);

    // Pop stack entries for same/higher level (sections ended)
    while (stack.length > 0 && stack[stack.length - 1] >= level) stack.pop();

    if (stack.length > 0) {
      // Inside a collapsed ancestor — hide this heading too
      decs.push(Decoration.node(offset, offset + node.nodeSize, {
        class: "noter-collapsed-content",
      }));
      continue;
    }

    // Visible heading — add toggle button if content exists beneath it
    const canCollapse = hasContent(children, i, level);

    if (canCollapse) {
      const isCollapsed = collapsed.has(key);

      // Widget injected at pos+1 (just inside the heading, before text)
      const widget = Decoration.widget(
        offset + 1,
        () => {
          const btn     = document.createElement("button");
          btn.className = "noter-collapse-btn";
          btn.contentEditable = "false";
          btn.setAttribute("data-collapse-key", key);
          btn.title = isCollapsed ? "Expand section" : "Collapse section";

          // SVG chevron
          btn.innerHTML = isCollapsed
            ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`
            : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

          btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const view = viewRef.current;
            if (!view) return;
            view.dispatch(
              view.state.tr.setMeta(KEY, key)
            );
          });

          return btn;
        },
        { side: -1, key: `toggle:${key}:${isCollapsed}` }
      );

      decs.push(widget);

      // If collapsed, push to stack so descendants get hidden
      if (isCollapsed) stack.push(level);
    }
  }

  return DecorationSet.create(doc, decs);
}

// ── Extension ─────────────────────────────────────────────────────────────────

export const CollapsibleHeadings = Extension.create({
  name: "collapsibleHeadings",

  addProseMirrorPlugins() {
    // viewRef is populated in the plugin's view() callback
    // and read inside widget event handlers
    const viewRef: { current: any } = { current: null };

    return [
      new Plugin<Set<string>>({
        key: KEY,

        state: {
          init: () => new Set<string>(),
          apply(tr, prev) {
            const toggledKey = tr.getMeta(KEY) as string | undefined;
            if (!toggledKey) return prev;
            const next = new Set(prev);
            if (next.has(toggledKey)) next.delete(toggledKey);
            else                      next.add(toggledKey);
            return next;
          },
        },

        props: {
          decorations(state) {
            const collapsed = KEY.getState(state);
            if (!collapsed) return DecorationSet.empty;
            return buildDecs(state.doc, collapsed, viewRef);
          },
        },

        // Capture the EditorView reference as soon as the plugin mounts
        view(editorView) {
          viewRef.current = editorView;
          return {
            update(view) { viewRef.current = view; },
            destroy()    { viewRef.current = null; },
          };
        },
      }),
    ];
  },

  // Inject CSS when extension is created (safe — checks for duplicate)
  onCreate() {
    if (typeof document !== "undefined") injectCSS();
  },
});