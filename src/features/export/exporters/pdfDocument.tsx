// src/features/export/exporters/pdfDocument.tsx
// All styles use only Yoga-compatible CSS properties.
// gap → replaced with marginRight on children
// objectFit, maxHeight → removed

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { renderNodes } from "./pdfContent";

const styles = StyleSheet.create({
  page: {
    paddingTop:      56,
    paddingBottom:   64,
    paddingLeft:     64,
    paddingRight:    64,
    backgroundColor: "#ffffff",
    fontFamily:      "CrimsonPro",
    fontSize:        11,
    color:           "#1a1a1a",
  },

  title: {
    fontSize:     26,
    fontFamily:   "CrimsonPro-Bold",
    color:        "#0d0d0d",
    marginBottom: 4,
    lineHeight:   1.25,
  },

  meta: {
    fontSize:     9,
    fontFamily:   "Courier",
    color:        "#888888",
    marginBottom: 16,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e0dbd2",
    marginBottom:      20,
  },

  // Tags row — NO gap (unsupported in Yoga)
  // Each tag gets marginRight instead
  tagsRow: {
    flexDirection: "row",
    flexWrap:      "wrap",
    marginBottom:  14,
  },

  tag: {
    fontSize:          8,
    fontFamily:        "Courier",
    color:             "#d4903a",
    backgroundColor:   "#fff4e6",
    paddingLeft:       6,
    paddingRight:      6,
    paddingTop:        2,
    paddingBottom:     2,
    borderRadius:      3,
    marginRight:       4,   // ← instead of gap
    marginBottom:      4,
  },

  footer: {
    position:       "absolute",
    bottom:         28,
    left:           64,
    right:          64,
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
  },

  footerText: {
    fontSize:   8,
    fontFamily: "Courier",
    color:      "#bbbbbb",
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface NotePDFProps {
  note: {
    id:         string;
    title:      string;
    content:    any;
    tags?:      string[];
    createdAt?: number;
    updatedAt?: number;
  };
  noteStore?: any;
}

// ── Document ──────────────────────────────────────────────────────────────────

export function NotePDF({ note, noteStore }: NotePDFProps) {
  const nodes      = note.content?.content ?? [];
  const dateStr    = formatDate(note.updatedAt ?? note.createdAt);
  const tags       = note.tags ?? [];
  const title      = note.title || "Untitled";

  return (
    <Document
      title={title}
      author="noter"
      creator="noter"
      producer="@react-pdf/renderer"
      keywords={tags.join(", ")}
    >
      <Page size="A4" style={styles.page}>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Date */}
        {dateStr ? <Text style={styles.meta}>{dateStr}</Text> : null}

        {/* Tags — each with marginRight instead of gap */}
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <Text key={tag} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Body — per-node error boundary prevents one bad node from killing all */}
        {renderNodes(nodes, noteStore)}

        {/* Page footer — fixed = appears on every page */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{title}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
}