import { useHasTabs } from "@/hooks/useBreakpoint";
import { DesktopLayout } from "./DesktopLayout";
import { MobileLayout }  from "./MobileLayout";
import { useKernelReady } from "@/core";

// ── Boot splash ───────────────────────────────────────────────────────────────

function BootSplash() {
  return (
    <div className="fixed inset-0 bg-base flex items-center justify-center z-50 animate-fade-in">
      <div className="text-center space-y-3">
        <p className="font-serif italic text-4xl text-ink/30 select-none">noter</p>
        <div className="flex gap-1 justify-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full bg-amber/40 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────

export function AppShell() {
  const ready  = useKernelReady();
  const hasTabs = useHasTabs();

  if (!ready) return <BootSplash />;

  return (
    <div className="h-screen w-screen overflow-hidden bg-base text-ink">
      {hasTabs ? <DesktopLayout /> : <MobileLayout />}
    </div>
  );
}
