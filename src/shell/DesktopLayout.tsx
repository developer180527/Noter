import { Sidebar }       from "@/features/sidebar/components/Sidebar";
import { TabBar }        from "@/features/tabs/components/TabBar";
import { TabContent }    from "@/features/tabs/components/TabContent";
import { COMPONENT_REGISTRY } from "./component-registry";
import { ErrorBoundary } from "./ErrorBoundary";

// No TitleBar — the sidebar header strip IS the drag region + traffic light zone.

export function DesktopLayout() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar — its header provides the drag region + traffic light inset */}
      <Sidebar />

      {/* Main column */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TabBar />
        <ErrorBoundary>
          <TabContent registry={COMPONENT_REGISTRY} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
