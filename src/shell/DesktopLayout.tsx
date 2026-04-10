import { TitleBar }    from "./TitleBar";
import { KernelSlot } from "./KernelSlot";
import { TabBar }      from "@/features/tabs/components/TabBar";
import { TabContent }  from "@/features/tabs/components/TabContent";
import { COMPONENT_REGISTRY } from "./component-registry";
import { ErrorBoundary } from "./ErrorBoundary";

export function DesktopLayout() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <KernelSlot name="sidebar.activityBar" />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TabBar />
          <div className="flex flex-1 overflow-hidden">
            <KernelSlot name="sidebar.panel" />
            <ErrorBoundary>
              <TabContent registry={COMPONENT_REGISTRY} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}