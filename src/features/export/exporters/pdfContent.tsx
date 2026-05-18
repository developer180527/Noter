// src/features/export/exporters/pdfContent.tsx
// @react-pdf/renderer uses Yoga layout — only a subset of CSS is supported.
// Unsupported properties cause silent render failures.
// Rules followed here:
//   ✗ gap, rowGap, columnGap       → use marginRight/marginBottom on children
//   ✗ maxHeight, minHeight         → use height
//   ✗ objectFit                    → omit, use explicit width/height
//   ✗ lineHeight > 2 inside View   → keep on Text directly, not nested
//   ✓ borderLeftWidth + borderLeftColor  → supported
//   ✓ backgroundColor, borderRadius     → supported
//   ✓ padding, margin, flex             → supported

import { Text, View, Image, Link, StyleSheet } from "@react-pdf/renderer";

// ── StyleSheet ────────────────────────────────────────────────────────────────

export const contentStyles = StyleSheet.create({
  paragraph:  { marginBottom: 6, flexDirection: "row", flexWrap: "wrap" },

  h1: { fontSize: 22, fontFamily: "CrimsonPro-Bold",     marginBottom: 8,  marginTop: 16, color: "#1a1a1a" },
  h2: { fontSize: 17, fontFamily: "CrimsonPro-Bold",     marginBottom: 6,  marginTop: 12, color: "#1a1a1a" },
  h3: { fontSize: 14, fontFamily: "CrimsonPro-SemiBold", marginBottom: 4,  marginTop: 10, color: "#1a1a1a" },

  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: "#d4903a",
    paddingLeft:     12,
    marginTop:       8,
    marginBottom:    8,
    paddingTop:      4,
    paddingBottom:   4,
  },

  codeBlock: {
    backgroundColor: "#1a1a1a",
    borderRadius:    4,
    padding:         10,
    marginTop:       8,
    marginBottom:    8,
  },

  // Lists — use marginRight instead of gap
  bulletListItem:  { flexDirection: "row", marginBottom: 3, paddingLeft: 8 },
  orderedListItem: { flexDirection: "row", marginBottom: 3, paddingLeft: 8 },
  listBullet:      { width: 14, fontFamily: "CrimsonPro", fontSize: 11, color: "#555", marginRight: 4 },
  listContent:     { flex: 1, flexDirection: "row", flexWrap: "wrap" },

  hr: { borderBottomWidth: 1, borderBottomColor: "#e0dbd2", marginTop: 12, marginBottom: 12 },

  // Image — no objectFit, no maxHeight (unsupported in Yoga)
  image: { width: "100%", marginTop: 8, marginBottom: 8 },

  noteLink: { color: "#d4903a", fontFamily: "CrimsonPro" },

  syncedBlock: {
    borderLeftWidth:  3,
    borderLeftColor:  "#d4903a",
    backgroundColor:  "#fff8f0",
    paddingLeft:      10,
    paddingTop:       6,
    paddingBottom:    6,
    marginTop:        6,
    marginBottom:     6,
  },

  syncedLabel: {
    fontSize:     8,
    fontFamily:   "Courier",
    color:        "#d4903a",
    marginBottom: 3,
  },

  youtubeBlock: {
    borderLeftWidth:  3,
    borderLeftColor:  "#e05c5c",
    paddingLeft:      12,
    marginTop:        8,
    marginBottom:     8,
    paddingTop:       4,
    paddingBottom:    4,
  },

  // Inline text defaults
  bodyText: {
    fontFamily: "CrimsonPro",
    fontSize:   11,
    color:      "#1a1a1a",
  },
});

// ── Text extraction ───────────────────────────────────────────────────────────

export function extractText(node: any): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  if (Array.isArray(node.content)) return node.content.map(extractText).join("");
  return "";
}

// ── Inline mark → style ───────────────────────────────────────────────────────

function resolveTextStyle(marks: any[]): Record<string, any> {
  const style: Record<string, any> = {
    fontFamily: "CrimsonPro",
    fontSize:   11,
    color:      "#1a1a1a",
  };

  for (const mark of marks ?? []) {
    switch (mark.type) {
      case "bold":
        style.fontFamily = style.fontStyle === "italic"
          ? "CrimsonPro-BoldItalic"
          : "CrimsonPro-Bold";
        break;
      case "italic":
        style.fontStyle  = "italic";
        style.fontFamily = style.fontFamily === "CrimsonPro-Bold"
          ? "CrimsonPro-BoldItalic"
          : "CrimsonPro-Italic";
        break;
      case "underline":
        style.textDecoration = "underline";
        break;
      case "strike":
        style.textDecoration = "line-through";
        break;
      case "highlight":
        style.backgroundColor = "#ffe9a0";
        break;
      case "code":
        style.fontFamily      = "Courier";
        style.fontSize        = 10;
        style.backgroundColor = "#f0ece6";
        style.color           = "#b85c00";
        break;
      case "textStyle":
        if (mark.attrs?.fontFamily) {
          const fontMap: Record<string, string> = {
            "Inter, ui-sans-serif, sans-serif":                "Helvetica",
            "Lora, Georgia, ui-serif, serif":                  "CrimsonPro",
            "'JetBrains Mono', ui-monospace, monospace":       "JetBrainsMono",
            "Nunito, Poppins, sans-serif":                     "Helvetica",
            "'Roboto Slab', 'Zilla Slab', serif":              "CrimsonPro",
          };
          style.fontFamily = fontMap[mark.attrs.fontFamily] ?? "CrimsonPro";
        }
        if (mark.attrs?.color) style.color = mark.attrs.color;
        break;
    }
  }

  return style;
}

// ── Safe node renderer (wraps each node, never throws) ────────────────────────

export function renderNodes(nodes: any[], noteStore?: any): any[] {
  return (nodes ?? []).map((node, i) => safeRenderNode(node, i, noteStore));
}

function safeRenderNode(node: any, key: number, noteStore?: any): any {
  try {
    return renderNode(node, key, noteStore);
  } catch (err) {
    // A single bad node never kills the entire PDF — renders a placeholder
    console.warn("PDF render error on node:", node?.type, err);
    return (
      <View key={key} style={{ marginVertical: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: "#ccc" }}>
        <Text style={{ fontSize: 9, fontFamily: "JetBrainsMono", color: "#888" }}>
          [Could not render: {node?.type ?? "unknown"}]
        </Text>
      </View>
    );
  }
}

function renderNode(node: any, key: number, noteStore?: any): any {
  if (!node) return null;

  switch (node.type) {

    // ── Inline text ───────────────────────────────────────────────────────────
    case "text": {
      if (!node.text) return null;
      const style    = resolveTextStyle(node.marks ?? []);
      const linkMark = (node.marks ?? []).find((m: any) => m.type === "link");
      if (linkMark?.attrs?.href) {
        return (
          <Link key={key} src={linkMark.attrs.href} style={style}>
            {node.text}
          </Link>
        );
      }
      return <Text key={key} style={style}>{node.text}</Text>;
    }

    // ── Paragraph ─────────────────────────────────────────────────────────────
    case "paragraph": {
      const children = (node.content ?? []).map((c: any, i: number) =>
        safeRenderNode(c, i, noteStore)
      ).filter(Boolean);

      if (!children.length) {
        // Empty paragraph = vertical spacer
        return <View key={key} style={{ height: 8 }} />;
      }

      return (
        <View key={key} style={contentStyles.paragraph}>
          {children}
        </View>
      );
    }

    // ── Headings ──────────────────────────────────────────────────────────────
    case "heading": {
      const level = (node.attrs?.level ?? 1) as 1 | 2 | 3;
      const style = level === 1 ? contentStyles.h1
                  : level === 2 ? contentStyles.h2
                  : contentStyles.h3;
      const text  = extractText(node);
      // H1 gets a page break hint
      return (
        <Text key={key} style={style} break={level === 1}>
          {text}
        </Text>
      );
    }

    // ── Blockquote ────────────────────────────────────────────────────────────
    case "blockquote":
      return (
        <View key={key} style={contentStyles.blockquote}>
          {(node.content ?? []).map((c: any, i: number) =>
            safeRenderNode(c, i, noteStore)
          )}
        </View>
      );

    // ── Code block ────────────────────────────────────────────────────────────
    case "codeBlock": {
      const code = extractText(node);
      return (
        <View key={key} style={contentStyles.codeBlock}>
          <Text style={{
            fontFamily: "Courier", 
            fontSize:   9.5,
            color:      "#e8e0d5",
          }}>
            {code || " "}
          </Text>
        </View>
      );
    }

    // ── Bullet list ───────────────────────────────────────────────────────────
    case "bulletList":
      return (
        <View key={key} style={{ marginTop: 4, marginBottom: 4 }}>
          {(node.content ?? []).map((item: any, i: number) => (
            <View key={i} style={contentStyles.bulletListItem}>
              <Text style={contentStyles.listBullet}>•</Text>
              <View style={contentStyles.listContent}>
                {(item.content ?? []).map((c: any, j: number) =>
                  safeRenderNode(c, j, noteStore)
                )}
              </View>
            </View>
          ))}
        </View>
      );

    // ── Ordered list ──────────────────────────────────────────────────────────
    case "orderedList": {
      let counter = 0;
      return (
        <View key={key} style={{ marginTop: 4, marginBottom: 4 }}>
          {(node.content ?? []).map((item: any, i: number) => {
            counter++;
            return (
              <View key={i} style={contentStyles.orderedListItem}>
                <Text style={contentStyles.listBullet}>{counter}.</Text>
                <View style={contentStyles.listContent}>
                  {(item.content ?? []).map((c: any, j: number) =>
                    safeRenderNode(c, j, noteStore)
                  )}
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    // ── List item fallback ────────────────────────────────────────────────────
    case "listItem":
      return (
        <View key={key} style={contentStyles.listContent}>
          {(node.content ?? []).map((c: any, i: number) =>
            safeRenderNode(c, i, noteStore)
          )}
        </View>
      );

    // ── Horizontal rule ───────────────────────────────────────────────────────
    case "horizontalRule":
      return <View key={key} style={contentStyles.hr} />;

    // ── Image ─────────────────────────────────────────────────────────────────
    case "image":
      if (!node.attrs?.src) return null;
      return (
        <Image
          key={key}
          src={node.attrs.src}
          style={contentStyles.image}
        />
      );

    // ── Note link ─────────────────────────────────────────────────────────────
    case "noteLink":
      return (
        <Text key={key} style={contentStyles.noteLink}>
          [[{node.attrs?.noteTitle ?? "Linked note"}]]
        </Text>
      );

    // ── Synced block ──────────────────────────────────────────────────────────
    case "syncedBlock": {
      const { sourceNoteId, blockId } = node.attrs ?? {};
      const srcNote  = noteStore
        ? (noteStore.notes ?? []).find((n: any) => n.id === sourceNoteId)
        : null;
      const doc      = srcNote?.content ?? srcNote?.body;
      const srcBlock = typeof doc === "object"
        ? (doc?.content ?? []).find((n: any) => n.attrs?.blockId === blockId)
        : null;

      return (
        <View key={key} style={contentStyles.syncedBlock}>
          <Text style={contentStyles.syncedLabel}>
            synced · {srcNote?.title ?? "Unknown note"}
          </Text>
          {srcBlock
            ? safeRenderNode(srcBlock, 0, noteStore)
            : (
              <Text style={{ fontSize: 10, color: "#888", fontFamily: "CrimsonPro" }}>
                [Block not found]
              </Text>
            )
          }
        </View>
      );
    }

    // ── Hard break ────────────────────────────────────────────────────────────
    case "hardBreak":
      return <Text key={key}>{"\n"}</Text>;

    // ── YouTube (not renderable — show placeholder) ───────────────────────────
    case "youtube":
      return (
        <View key={key} style={contentStyles.youtubeBlock}>
          <Text style={{ fontSize: 9, fontFamily: "JetBrainsMono", color: "#888" }}>
            [YouTube: {node.attrs?.src ?? "embedded video"}]
          </Text>
        </View>
      );

    // ── Unknown — try children ────────────────────────────────────────────────
    default:
      if (Array.isArray(node.content) && node.content.length > 0) {
        return (
          <View key={key}>
            {node.content.map((c: any, i: number) => safeRenderNode(c, i, noteStore))}
          </View>
        );
      }
      return null;
  }
}