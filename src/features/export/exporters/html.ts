import { PAGE_SIZES } from "@/features/notes/page-sizes";
import type { Note } from "@/features/notes/types";
import { downloadTextFile } from "./download";

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "note";
}

function convertBodyToHtml(text: string): string {
  return text.split("\n").map((line) => {
    if (!line.trim()) return "<p>&nbsp;</p>";
    let html = line
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
    if (/^#{3}\s/.test(line)) return `<h3>${html.replace(/^#{3}\s/, "")}</h3>`;
    if (/^#{2}\s/.test(line)) return `<h2>${html.replace(/^#{2}\s/, "")}</h2>`;
    if (/^#\s/.test(line))    return `<h1>${html.replace(/^#\s/,   "")}</h1>`;
    if (/^[-*]\s/.test(line)) return `<li>${html.replace(/^[-*]\s/, "")}</li>`;
    return `<p>${html}</p>`;
  }).join("\n");
}

export async function exportHtml(note: Note): Promise<void> {
  const dims = PAGE_SIZES[note.pageSize ?? "a4"];

  const tagsHtml = note.tags.length > 0
    ? `<div class="tags">${note.tags.map((t) => `<span class="tag">#${t}</span>`).join(" ")}</div>`
    : "";

  const metaHtml = `<div class="meta">Created ${new Date(note.createdAt).toLocaleDateString()} · Updated ${new Date(note.updatedAt).toLocaleDateString()} · ${dims.label}</div>`;

  const pages = note.body.split("\f");
  const pagesHtml = pages.map((pageText, i) => {
    const isLast   = i === pages.length - 1;
    const bodyHtml = convertBodyToHtml(pageText);
    const pageBreak = isLast ? "" : 'style="page-break-after: always;"';
    return `
    <div class="page" ${pageBreak}>
      ${i === 0 ? `<h1 class="title">${note.title}</h1>${tagsHtml}${metaHtml}<div class="divider"></div>` : `<div class="page-num">Page ${i + 1}</div>`}
      <div class="body">${bodyHtml}</div>
    </div>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${note.title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#2c2c2c;display:flex;flex-direction:column;align-items:center;padding:40px 20px;gap:32px;font-family:'Georgia',serif;color:#1a1a1a}
    .page{background:#f7f4ef;width:${dims.width}px;min-height:${dims.height}px;padding:${dims.marginTop}px ${dims.marginRight}px ${dims.marginBottom}px ${dims.marginLeft}px;box-shadow:0 4px 32px rgba(0,0,0,0.4)}
    h1.title{font-size:2rem;font-weight:300;line-height:1.2;margin-bottom:.5rem}
    .tags{margin-bottom:.75rem}
    .tag{display:inline-block;font-size:.7rem;font-family:monospace;color:#9a9080;background:#ede9e2;border-radius:3px;padding:1px 5px;margin-right:4px}
    .meta{font-size:.7rem;font-family:monospace;color:#b0a898;margin-bottom:1rem}
    .divider{height:1px;background:#e0dbd2;margin-bottom:1.5rem}
    .page-num{font-size:.7rem;font-family:monospace;color:#b0a898;margin-bottom:1rem}
    p,li{font-size:1rem;line-height:1.9;color:#1a1a1a}
    h1{font-size:1.5rem;font-weight:600;margin:1.5rem 0 .5rem}
    h2{font-size:1.25rem;font-weight:600;margin:1.25rem 0 .5rem}
    h3{font-size:1.1rem;font-weight:600;margin:1rem 0 .25rem}
    li{margin-left:1.5rem;list-style-type:disc}
    code{font-family:monospace;font-size:.85em;background:#ede9e2;padding:.1em .3em;border-radius:3px}
    strong{font-weight:600}
    @media print{body{background:white;padding:0;gap:0}.page{box-shadow:none;width:100%;min-height:0}@page{size:${dims.cssSize} portrait;margin:0}}
  </style>
</head>
<body>${pagesHtml}</body>
</html>`;

  await downloadTextFile(`${slugify(note.title)}.html`, html, "text/html");
}