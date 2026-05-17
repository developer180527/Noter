import { TitleBar }    from "./TitleBar";
import { KernelSlot }  from "./KernelSlot";
import { TabBar }      from "@/features/tabs/components/TabBar";
import { TabContent }  from "@/features/tabs/components/TabContent";
import { COMPONENT_REGISTRY } from "./component-registry";
import { ErrorBoundary }      from "./ErrorBoundary";
import { useActivityBarStore } from "@/shell/ActivityBar.store";

export function DesktopLayout() {
  const position = useActivityBarStore((s) => s.position);
  const isBottom = position === "bottom";
  const isRight  = position === "right";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">

        {/* Left activity bar */}
        {!isBottom && !isRight && (
          <KernelSlot name="sidebar.activityBar" />
        )}

        {/* Main content column */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <TabBar />

          <div className="flex flex-1 overflow-hidden">
            <KernelSlot name="sidebar.panel" />
            <ErrorBoundary>
              <TabContent registry={COMPONENT_REGISTRY} />
            </ErrorBoundary>
          </div>

          {/* Bottom activity bar */}
          {isBottom && (
            <KernelSlot name="sidebar.activityBar" />
          )}
        </div>

        {/* Right activity bar */}
        {isRight && (
          <KernelSlot name="sidebar.activityBar" />
        )}

      </div>
    </div>
  );
}