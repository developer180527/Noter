import { CanvasList }   from "./CanvasList";
import { CanvasEditor } from "./CanvasEditor";
import type { TabComponentProps } from "@/features/tabs/types";

// Canvas feature CSS — override Excalidraw accent to amber
const EXCALIDRAW_CSS = `
  .excalidraw { --color-primary: #d4903a !important; --color-primary-darker: #8a5c1f !important; --color-primary-light: rgba(212,144,58,0.15) !important; }
  .excalidraw .Island { background: #131313 !important; border-color: #2a2a2a !important; }
  .excalidraw button.ToolIcon { color: #9a9390 !important; }
  .excalidraw button.ToolIcon:hover { color: #e8e0d5 !important; background: #1a1a1a !important; }
  .excalidraw button.ToolIcon.is-selected { color: #d4903a !important; background: rgba(212,144,58,0.15) !important; }
  .excalidraw .layer-ui__wrapper { --ui-font: 'Geist', system-ui, sans-serif !important; }
`;

export function CanvasPage(_props: TabComponentProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <style>{EXCALIDRAW_CSS}</style>
      <CanvasList />
      <CanvasEditor />
    </div>
  );
}
