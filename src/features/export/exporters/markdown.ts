import type { Note } from "@/features/notes/types";
import { downloadTextFile } from "./download";

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "note";
}

export async function exportMarkdown(note: Note): Promise<void> {
  const frontmatter = [
    "---",
    `title: "${note.title.replace(/"/g, '\\"')}"`,
    `created: ${new Date(note.createdAt).toISOString()}`,
    `updated: ${new Date(note.updatedAt).toISOString()}`,
    note.tags.length > 0 ? `tags: [${note.tags.map((t) => `"${t}"`).join(", ")}]` : null,
    note.pageSize ? `pageSize: ${note.pageSize}` : null,
    `pages: ${note.body.split("\f").length}`,
    "---",
  ].filter(Boolean).join("\n");

  const pages = note.body.split("\f");
  const bodyWithBreaks = pages
    .map((page, i) => i === 0 ? page : `\n\n---\n*Page ${i + 1}*\n\n${page}`)
    .join("");

  const content = `${frontmatter}\n\n# ${note.title}\n\n${bodyWithBreaks}`;
  await downloadTextFile(`${slugify(note.title)}.md`, content, "text/markdown");
}