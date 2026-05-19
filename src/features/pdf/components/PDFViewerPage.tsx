// src/features/pdf/components/PDFViewerPage.tsx
// Wrapper registered in the slot registry as "pdf:viewer".
// Reads pdfPath and pdfName from the active tab's props,
// then renders PDFViewer with them.
// This pattern matches how other features (notes, canvas) work.

import { useTabStore } from "@/features/tabs/tab.store";
import { PDFViewer }   from "./PDFViewer";

export function PDFViewerPage() {
  const activeTab = useTabStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId)
  );

  const pdfPath = activeTab?.props?.pdfPath as string | undefined;
  const pdfName = activeTab?.props?.pdfName as string | undefined;

  if (!pdfPath || !pdfName) {
    return (
      <div className="flex-1 flex items-center justify-center bg-base">
        <p className="text-xs font-mono text-subtle">No PDF selected</p>
      </div>
    );
  }

  return <PDFViewer filePath={pdfPath} fileName={pdfName} />;
}