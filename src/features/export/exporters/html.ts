// ─────────────────────────────────────────────────────────────────────────────
// HTML Exporter
// Generates a fully self-contained HTML file from the page canvas.
// The exported file looks identical in any browser, on any device,
// because it uses the same fixed-width layout as the screen canvas.
// ─────────────────────────────────────────────────────────────────────────────

import { PAGE_SIZES } from "@/features/notes/page-sizes";
import type { Note } from "@/features/notes/types";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "note";
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportHtml(note: Note): void {
  const dims = PAGE_SIZES[note.pageSize ?? "a4"];

  // Convert plain text body to HTML paragraphs
  const bodyHtml = note.body
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "<p>&nbsp;</p>";
      // Basic markdown: **bold**, *italic*, # headings, - list items
      let html = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>");

      if (/^#{3}\s/.test(line)) return `<h3>${html.replace(/^#{3}\s/, "")}</h3>`;
      if (/^#{2}\s/.test(line)) return `<h2>${html.replace(/^#{2}\s/, "")}</h2>`;
      if (/^#\s/.test(line))    return `<h1>${html.replace(/^#\s/,   "")}</h1>`;
      if (/^[-*]\s/.test(line)) return `<li>${html.replace(/^[-*]\s/, "")}</li>`;
      return `<p>${html}</p>`;
    })
    .join("\n");

  const tagsHtml = note.tags.length > 0
    ? `<div class="tags">${note.tags.map((t) => `<span class="tag">#${t}</span>`).join(" ")}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${note.title}</title>
  <style>
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #2c2c2c;
      display: flex;
      justify-content: center;
      padding: 40px 20px;
      font-family: 'Georgia', serif;
      color: #1a1a1a;
    }

    /* ── Paper ── */
    .page {
      background: #f7f4ef;
      width: ${dims.width}px;
      min-height: ${dims.height}px;
      padding: ${dims.marginTop}px ${dims.marginRight}px ${dims.marginBottom}px ${dims.marginLeft}px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.4);
    }

    /* ── Typography ── */
    h1.title {
      font-size: 2rem;
      font-weight: 300;
      line-height: 1.2;
      margin-bottom: 0.5rem;
      color: #1a1a1a;
    }
    .tags { margin-bottom: 1.5rem; }
    .tag {
      display: inline-block;
      font-size: 0.7rem;
      font-family: monospace;
      color: #888;
      margin-right: 0.5rem;
    }
    .meta {
      font-size: 0.7rem;
      font-family: monospace;
      color: #aaa;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #eee;
    }
    p, li {
      font-size: 1rem;
      line-height: 1.9;
      margin-bottom: 0;
      color: #1a1a1a;
    }
    h1 { font-size: 1.5rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
    h2 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
    h3 { font-size: 1.1rem;  font-weight: 600; margin: 1rem 0 0.25rem; }
    li { margin-left: 1.5rem; list-style-type: disc; }
    code {
      font-family: monospace;
      font-size: 0.85em;
      background: #f4f4f4;
      padding: 0.1em 0.3em;
      border-radius: 3px;
    }
    strong { font-weight: 600; }

    /* ── Print ── */
    @media print {
      body { background: white; padding: 0; }
      .page {
        box-shadow: none;
        width: 100%;
        padding: ${dims.marginTop}px ${dims.marginRight}px ${dims.marginBottom}px ${dims.marginLeft}px;
      }
      @page { size: ${dims.cssSize} portrait; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <h1 class="title">${note.title}</h1>
    ${tagsHtml}
    <div class="meta">
      Created ${new Date(note.createdAt).toLocaleDateString()} ·
      Updated ${new Date(note.updatedAt).toLocaleDateString()} ·
      ${dims.label}
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;

  downloadFile(`${slugify(note.title)}.html`, html, "text/html");
}
