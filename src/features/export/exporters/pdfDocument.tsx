// src/features/export/exporters/pdfDocument.tsx
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { renderNodes } from "./pdfContent";

const styles = StyleSheet.create({
  page:      { paddingTop: 56, paddingBottom: 64, paddingLeft: 64, paddingRight: 64, backgroundColor: "#ffffff", fontFamily: "CrimsonPro", fontSize: 11, lineHeight: 1.75, color: "#1a1a1a" },
  title:     { fontSize: 26, fontFamily: "CrimsonPro-Bold", color: "#0d0d0d", marginBottom: 4, lineHeight: 1.25 },
  meta:      { fontSize: 9, fontFamily: "JetBrainsMono", color: "#888", marginBottom: 20 },
  divider:   { borderBottomWidth: 1, borderBottomColor: "#e0dbd2", marginBottom: 20 },
  tagsRow:   { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 14 },
  tag:       { fontSize: 8, fontFamily: "JetBrainsMono", color: "#d4903a", backgroundColor: "#fff4e6", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  footer:    { position: "absolute", bottom: 28, left: 64, right: 64, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerTxt: { fontSize: 8, fontFamily: "JetBrainsMono", color: "#bbb" },
});

function formatDate(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

interface NotePDFProps {
  note:       any;
  noteStore?: any;
}

export function NotePDF({ note, noteStore }: NotePDFProps) {
  const nodes = note.content?.content ?? [];
  const date  = formatDate(note.updatedAt ?? note.createdAt);

  return (
    <Document title={note.title || "Untitled"} author="noter" creator="noter" producer="@react-pdf/renderer" keywords={(note.tags ?? []).join(", ")}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{note.title || "Untitled"}</Text>
        {date ? <Text style={styles.meta}>{date}</Text> : null}
        {(note.tags ?? []).length > 0 && (
          <View style={styles.tagsRow}>
            {(note.tags ?? []).map((tag: string) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}
          </View>
        )}
        <View style={styles.divider} />
        {renderNodes(nodes, noteStore)}
        <View style={styles.footer} fixed>
          <Text style={styles.footerTxt}>{note.title || "Untitled"}</Text>
          <Text style={styles.footerTxt} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}