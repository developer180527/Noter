import { isTauri } from "@/bridge";

export async function downloadTextFile(
  filename: string,
  content:  string,
  _mimeType: string
): Promise<void> {
  if (isTauri) {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog" as string) as {
        save: (opts: Record<string, unknown>) => Promise<string | null>
      };
      const { writeTextFile } = await import("@tauri-apps/plugin-fs") as {
        writeTextFile: (path: string, content: string) => Promise<void>
      };

      const ext = filename.split(".").pop() ?? "*";
      const savePath = await save({
        defaultPath: filename,
        filters: [{ name: filename, extensions: [ext] }],
      });

      if (savePath) {
        await writeTextFile(savePath, content);
      }
    } catch (err) {
      console.error("[Download] Tauri save failed:", err);
    }
    return;
  }

  const blob = new Blob([content], { type: _mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}