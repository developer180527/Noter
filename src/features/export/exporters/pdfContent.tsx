// src/features/export/exporters/pdfContent.tsx
import { Text, View, Image, Link, StyleSheet } from "@react-pdf/renderer";

export const contentStyles = StyleSheet.create({
  paragraph:       { marginBottom: 6, flexDirection: "row", flexWrap: "wrap" },
  h1:              { fontSize: 22, fontFamily: "CrimsonPro-Bold",     marginBottom: 8,  marginTop: 16, color: "#1a1a1a" },
  h2:              { fontSize: 17, fontFamily: "CrimsonPro-Bold",     marginBottom: 6,  marginTop: 12, color: "#1a1a1a" },
  h3:              { fontSize: 14, fontFamily: "CrimsonPro-SemiBold", marginBottom: 4,  marginTop: 10, color: "#1a1a1a" },
  blockquote:      { borderLeftWidth: 3, borderLeftColor: "#d4903a", paddingLeft: 12, marginVertical: 8, color: "#555" },
  codeBlock:       { backgroundColor: "#1a1a1a", borderRadius: 4, padding: 10, marginVertical: 8 },
  bulletListItem:  { flexDirection: "row", marginBottom: 3, paddingLeft: 8 },
  orderedListItem: { flexDirection: "row", marginBottom: 3, paddingLeft: 8 },
  listBullet:      { width: 14, fontFamily: "CrimsonPro", fontSize: 11, color: "#555" },
  listContent:     { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  hr:              { borderBottomWidth: 1, borderBottomColor: "#e0dbd2", marginVertical: 12 },
  image:           { width: "100%", marginVertical: 8, objectFit: "contain", maxHeight: 300 },
  noteLink:        { color: "#d4903a", fontFamily: "CrimsonPro" },
  syncedBlock:     { borderLeftWidth: 3, borderLeftColor: "#d4903a", backgroundColor: "#fff8f0", paddingLeft: 10, paddingVertical: 6, marginVertical: 6 },
  syncedLabel:     { fontSize: 8, color: "#d4903a", fontFamily: "JetBrainsMono", marginBottom: 3 },
});

export function extractText(node: any): string {
  if (!node) return "";
  if (node.text) return node.text as string;
  if (Array.isArray(node.content)) return node.content.map(extractText).join("");
  return "";
}

function resolveTextStyle(marks: any[]): Record<string, any> {
  const style: Record<string, any> = { fontFamily: "CrimsonPro", fontSize: 11, color: "#1a1a1a" };
  for (const mark of marks ?? []) {
    switch (mark.type) {
      case "bold":      style.fontFamily = style.fontStyle === "italic" ? "CrimsonPro-BoldItalic" : "CrimsonPro-Bold"; break;
      case "italic":    style.fontStyle = "italic"; style.fontFamily = style.fontFamily === "CrimsonPro-Bold" ? "CrimsonPro-BoldItalic" : "CrimsonPro-Italic"; break;
      case "underline": style.textDecoration = "underline"; break;
      case "strike":    style.textDecoration = "line-through"; break;
      case "highlight": style.backgroundColor = "#ffe9a0"; break;
      case "code":      style.fontFamily = "JetBrainsMono"; style.fontSize = 10; style.backgroundColor = "#f0ece6"; style.color = "#b85c00"; break;
      case "textStyle":
        if (mark.attrs?.fontFamily) {
          const m: Record<string, string> = {
            "Inter, ui-sans-serif, sans-serif": "Helvetica",
            "Lora, Georgia, ui-serif, serif":   "CrimsonPro",
            "'JetBrains Mono', ui-monospace, monospace": "JetBrainsMono",
            "Nunito, Poppins, sans-serif":      "Helvetica",
            "'Roboto Slab', 'Zilla Slab', serif": "CrimsonPro",
          };
          style.fontFamily = m[mark.attrs.fontFamily] ?? "CrimsonPro";
        }
        if (mark.attrs?.color) style.color = mark.attrs.color;
        break;
    }
  }
  return style;
}

export function renderNodes(nodes: any[], noteStore?: any): any[] {
  return (nodes ?? []).map((n, i) => renderNode(n, i, noteStore));
}

function renderNode(node: any, key: number, noteStore?: any): any {
  if (!node) return null;
  switch (node.type) {
    case "text": {
      const style = resolveTextStyle(node.marks ?? []);
      const link  = (node.marks ?? []).find((m: any) => m.type === "link");
      if (link?.attrs?.href) return <Link key={key} src={link.attrs.href} style={style}>{node.text}</Link>;
      return <Text key={key} style={style}>{node.text}</Text>;
    }
    case "paragraph": {
      const ch = (node.content ?? []).map((c: any, i: number) => renderNode(c, i, noteStore));
      if (!ch.length) return <View key={key} style={{ height: 8 }} />;
      return <View key={key} style={contentStyles.paragraph}>{ch}</View>;
    }
    case "heading": {
      const level = node.attrs?.level ?? 1;
      const style = level === 1 ? contentStyles.h1 : level === 2 ? contentStyles.h2 : contentStyles.h3;
      return <Text key={key} style={style} break={level === 1}>{extractText(node)}</Text>;
    }
    case "blockquote":
      return <View key={key} style={contentStyles.blockquote}>{(node.content ?? []).map((c: any, i: number) => renderNode(c, i, noteStore))}</View>;
    case "codeBlock":
      return <View key={key} style={contentStyles.codeBlock}><Text style={{ fontFamily: "JetBrainsMono", fontSize: 9.5, color: "#e8e0d5", lineHeight: 1.5 }}>{extractText(node)}</Text></View>;
    case "bulletList":
      return (
        <View key={key} style={{ marginVertical: 4 }}>
          {(node.content ?? []).map((item: any, i: number) => (
            <View key={i} style={contentStyles.bulletListItem}>
              <Text style={contentStyles.listBullet}>•</Text>
              <View style={contentStyles.listContent}>{(item.content ?? []).map((c: any, j: number) => renderNode(c, j, noteStore))}</View>
            </View>
          ))}
        </View>
      );
    case "orderedList": {
      let counter = 0;
      return (
        <View key={key} style={{ marginVertical: 4 }}>
          {(node.content ?? []).map((item: any, i: number) => {
            counter++;
            return (
              <View key={i} style={contentStyles.orderedListItem}>
                <Text style={contentStyles.listBullet}>{counter}.</Text>
                <View style={contentStyles.listContent}>{(item.content ?? []).map((c: any, j: number) => renderNode(c, j, noteStore))}</View>
              </View>
            );
          })}
        </View>
      );
    }
    case "horizontalRule": return <View key={key} style={contentStyles.hr} />;
    case "image":          return node.attrs?.src ? <Image key={key} src={node.attrs.src} style={contentStyles.image} /> : null;
    case "noteLink":       return <Text key={key} style={contentStyles.noteLink}>[[{node.attrs?.noteTitle ?? "Linked note"}]]</Text>;
    case "syncedBlock": {
      const { sourceNoteId, blockId } = node.attrs ?? {};
      const src   = noteStore ? (noteStore.notes ?? []).find((n: any) => n.id === sourceNoteId) : null;
      const doc   = src?.content ?? src?.body;
      const block = typeof doc === "object" ? (doc?.content ?? []).find((n: any) => n.attrs?.blockId === blockId) : null;
      return (
        <View key={key} style={contentStyles.syncedBlock}>
          <Text style={contentStyles.syncedLabel}>synced · {src?.title ?? "Unknown"}</Text>
          {block ? renderNode(block, 0, noteStore) : <Text style={{ fontSize: 10, color: "#888", fontFamily: "CrimsonPro" }}>[Block not found]</Text>}
        </View>
      );
    }
    case "hardBreak": return <Text key={key}>{"\n"}</Text>;
    case "youtube":
      return <View key={key} style={{ ...contentStyles.blockquote, borderLeftColor: "#e05c5c" }}><Text style={{ fontSize: 9, fontFamily: "JetBrainsMono", color: "#888" }}>[YouTube: {node.attrs?.src ?? "embedded"}]</Text></View>;
    default:
      if (Array.isArray(node.content)) return <View key={key}>{node.content.map((c: any, i: number) => renderNode(c, i, noteStore))}</View>;
      return null;
  }
}