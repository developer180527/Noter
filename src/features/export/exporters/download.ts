import { saveExportTextFile } from "./fileSave";

export async function downloadTextFile(
  filename: string,
  content:  string,
  mimeType: string
): Promise<void> {
  await saveExportTextFile(filename, content, mimeType);
}
