import { useState } from "react";
import { CanvasList }   from "./CanvasList";
import { CanvasEditor } from "./CanvasEditor";
import type { TabComponentProps } from "@/features/tabs/types";

// Override Excalidraw accent + hide GitHub/social menu items
const EXCALIDRAW_CSS = `
  .excalidraw {
    --color-primary: #d4903a !important;
    --color-primary-darker: #8a5c1f !important;
    --color-primary-light: rgba(212,144,58,0.15) !important;
    --color-surface-mid: #131313 !important;
    --color-surface-low: #0d0d0d !important;
  }
  .excalidraw .Island { background: #131313 !important; border-color: #2a2a2a !important; }
  .excalidraw .layer-ui__wrapper__footer-right { bottom: 3.5rem !important; }
`;

export function CanvasPage(_props: TabComponentProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <style>{EXCALIDRAW_CSS}</style>
      {sidebarOpen && <CanvasList />}
      <CanvasEditor
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
    </div>
  );
}