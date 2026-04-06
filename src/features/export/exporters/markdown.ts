// ─────────────────────────────────────────────────────────────────────────────
// Markdown Exporter
// Downloads the note body as a .md file with YAML frontmatter.
// ─────────────────────────────────────────────────────────────────────────────

import type { Note } from "@/features/notes/types";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "note";
}

export function exportMarkdown(note: Note): void {
  const frontmatter = [
    "---",
    `title: "${note.title.replace(/"/g, '\\"')}"`,
    `created: ${new Date(note.createdAt).toISOString()}`,
    `updated: ${new Date(note.updatedAt).toISOString()}`,
    note.tags.length > 0 ? `tags: [${note.tags.map((t) => `"${t}"`).join(", ")}]` : null,
    note.pageSize ? `pageSize: ${note.pageSize}` : null,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const content = `${frontmatter}\n\n# ${note.title}\n\n${note.body}`;

  const blob = new Blob([content], { type: "text/markdown" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${slugify(note.title)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
