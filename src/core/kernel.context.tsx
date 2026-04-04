// ─────────────────────────────────────────────────────────────────────────────
// KernelContext
// Makes the Kernel available anywhere in the React tree without prop-drilling.
// Also provides a hook that subscribes to feature status changes.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Kernel } from "./kernel";
import { KernelEvents, type FeatureStatus } from "./types";

// ── Context ───────────────────────────────────────────────────────────────────

const KernelCtx = createContext<Kernel | null>(null);

export function KernelProvider({ kernel, children }: { kernel: Kernel; children: ReactNode }) {
  return <KernelCtx.Provider value={kernel}>{children}</KernelCtx.Provider>;
}

// ── useKernel ──────────────────────────────────────────────────────────────────

export function useKernel(): Kernel {
  const kernel = useContext(KernelCtx);
  if (!kernel) {
    throw new Error("useKernel must be used inside <KernelProvider>.");
  }
  return kernel;
}

// ── useFeatureStatus ──────────────────────────────────────────────────────────
// Subscribes to a feature's lifecycle events and returns the current status.

export function useFeatureStatus(featureId: string): FeatureStatus | "unknown" {
  const kernel = useKernel();
  const [status, setStatus] = useState<FeatureStatus | "unknown">(() =>
    kernel.getStatus(featureId)
  );

  useEffect(() => {
    const events = [
      KernelEvents.FEATURE_STARTED,
      KernelEvents.FEATURE_STOPPED,
      KernelEvents.FEATURE_DISABLED,
      KernelEvents.FEATURE_ERROR,
      KernelEvents.FEATURE_RESTARTED,
    ] as const;

    const unsubs = events.map((evt) =>
      kernel.events.on<{ featureId: string }>(evt, ({ featureId: fid }) => {
        if (fid === featureId) setStatus(kernel.getStatus(featureId));
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [kernel, featureId]);

  return status;
}

// ── useKernelReady ────────────────────────────────────────────────────────────

export function useKernelReady(): boolean {
  const kernel = useKernel();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = kernel.events.once(KernelEvents.KERNEL_READY, () => setReady(true));
    // In case we mount after boot
    const allRunning = kernel.getAllEntries().every((e) => e.status === "running" || e.status === "disabled");
    if (allRunning && kernel.getAllEntries().length > 0) {
      setReady(true);
      unsub();
    }
    return unsub;
  }, [kernel]);

  return ready;
}
