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
    --color-surface-mid: rgba(18,18,18,0.6) !important;
    --color-surface-low: rgba(10,10,10,0.7) !important;
  }

  /* Glassmorphic Islands — the properties panel, toolbar islands */
  .excalidraw .Island {
    background: rgba(16, 16, 16, 0.55) !important;
    backdrop-filter: blur(20px) saturate(1.4) !important;
    -webkit-backdrop-filter: blur(20px) saturate(1.4) !important;
    border: 1px solid rgba(255, 255, 255, 0.07) !important;
    border-radius: 14px !important;
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
  }

  /* Toolbar row — top center island */
  .excalidraw .App-toolbar .Island {
    border-radius: 12px !important;
  }

  /* Buttons inside islands */
  .excalidraw button.ToolIcon {
    color: #9a9390 !important;
    border-radius: 8px !important;
    transition: background 0.15s, color 0.15s !important;
  }
  .excalidraw button.ToolIcon:hover {
    color: #e8e0d5 !important;
    background: rgba(255,255,255,0.07) !important;
  }
  .excalidraw button.ToolIcon.is-selected {
    color: #d4903a !important;
    background: rgba(212,144,58,0.15) !important;
  }

  /* Properties panel section labels */
  .excalidraw .Island h3,
  .excalidraw .Island .Island-title {
    color: rgba(255,255,255,0.4) !important;
    font-size: 10px !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
  }

  /* Color swatches */
  .excalidraw .color-picker-swatch {
    border-radius: 6px !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
  }

  /* Footer zoom controls */
  .excalidraw .layer-ui__wrapper__footer-right .Island {
    border-radius: 10px !important;
  }

  /* Slider track */
  .excalidraw input[type="range"] {
    accent-color: #d4903a !important;
  }
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