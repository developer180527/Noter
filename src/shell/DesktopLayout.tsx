import { Sidebar }    from "@/features/sidebar/components/Sidebar";
import { TabBar }     from "@/features/tabs/components/TabBar";
import { TabContent } from "@/features/tabs/components/TabContent";
import { COMPONENT_REGISTRY } from "./component-registry";
import { ErrorBoundary } from "./ErrorBoundary";
import { isTauri } from "@/bridge";

// ── Custom titlebar (Tauri only) ──────────────────────────────────────────────
// titleBarStyle "Overlay" renders native macOS traffic lights at top-left.
// We need pl-[68px] so content doesn't render under them.

function TitleBar() {
  if (!isTauri) return null;
  return (
    <div
      data-tauri-drag-region
      className="h-9 bg-base border-b border-border shrink-0 flex items-center select-none pl-[68px]"
    >
      <span
        className="flex-1 text-center text-2xs font-mono text-subtle pr-[68px]"
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
          <ErrorBoundary>
            <TabContent registry={COMPONENT_REGISTRY} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
