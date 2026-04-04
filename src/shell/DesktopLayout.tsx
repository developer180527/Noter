import { Sidebar }    from "@/features/sidebar/components/Sidebar";
import { TabBar }     from "@/features/tabs/components/TabBar";
import { TabContent } from "@/features/tabs/components/TabContent";
import { COMPONENT_REGISTRY } from "./component-registry";
import { isTauri } from "@/bridge";

// ── Custom titlebar (Tauri only) ──────────────────────────────────────────────

function TitleBar() {
  if (!isTauri) return null;
  return (
    <div
      data-tauri-drag-region
      className="h-8 bg-base border-b border-border shrink-0 flex items-center px-4 select-none"
    >
      {/* macOS traffic lights are positioned by Tauri automatically when
          title bar overlay is on. We just provide the drag region. */}
      <span
        className="absolute left-1/2 -translate-x-1/2 text-2xs font-mono text-subtle"
        data-tauri-drag-region
      >
        noter
      </span>
    </div>
  );
}

// ── Desktop Layout ────────────────────────────────────────────────────────────

export function DesktopLayout() {
  return (
    <div className="flex flex-col h-full">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main column */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <TabBar />
          <TabContent registry={COMPONENT_REGISTRY} />
        </div>
      </div>
    </div>
  );
}
