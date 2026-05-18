import { isTauri } from "@/bridge";
import { useSettingsStore } from "@/features/settings/settings.store";

interface BrowserSaveFilePicker {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

interface BrowserFileHandle {
  createWritable(): Promise<{
    write(data: Blob): Promise<void>;
    close(): Promise<void>;
  }>;
}

interface BrowserWindowWithSavePicker extends Window {
  showSaveFilePicker?: (options?: BrowserSaveFilePicker) => Promise<BrowserFileHandle>;
}

function extensionOf(filename: string): string {
  return filename.includes(".") ? `.${filename.split(".").pop()}` : "";
}

async function resolveTauriExportPath(filename: string): Promise<string> {
  const { desktopDir, join } = await import("@tauri-apps/api/path");
  const directory = useSettingsStore.getState().exportDirectory ?? await desktopDir();
  return join(directory, filename);
}

export async function saveExportTextFile(
  filename: string,
  content: string,
  mimeType: string,
): Promise<void> {
  if (isTauri) {
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    await writeTextFile(await resolveTauriExportPath(filename), content);
    return;
  }

  await saveBrowserBlob(new Blob([content], { type: mimeType }), filename, mimeType);
}

export async function saveExportBlob(
  filename: string,
  blob: Blob,
  mimeType: string,
): Promise<void> {
  if (isTauri) {
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const buffer = await blob.arrayBuffer();
    await writeFile(await resolveTauriExportPath(filename), new Uint8Array(buffer));
    return;
  }

  await saveBrowserBlob(blob, filename, mimeType);
}

async function saveBrowserBlob(blob: Blob, filename: string, mimeType: string): Promise<void> {
  const picker = (window as BrowserWindowWithSavePicker).showSaveFilePicker;
  if (picker) {
    const ext = extensionOf(filename);
    const handle = await picker({
      suggestedName: filename,
      types: ext ? [{ description: filename, accept: { [mimeType]: [ext] } }] : undefined,
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
