// ─────────────────────────────────────────────────────────────────────────────
// KernelSlot
// Renders whatever React component a feature registered into a named slot.
// The shell uses this instead of importing feature components directly.
//
// Usage:
//   <KernelSlot name="sidebar.activityBar" />
//   <KernelSlot name="sidebar.panel" fallback={<div>Loading…</div>} />
//
// If no component is registered for the slot, renders null (or fallback).
// Re-renders when the kernel signals a slot update via the event bus.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, type ReactNode } from "react";
import { useKernel } from "@/core";

interface KernelSlotProps {
  name:      string;
  fallback?: ReactNode;
  // Any extra props are forwarded to the registered component
  [key: string]: unknown;
}

export function KernelSlot({ name, fallback = null, ...props }: KernelSlotProps) {
  const kernel = useKernel();

  // Re-render when slots change (features register after mount during onStart)
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = kernel.events.on("kernel:slot:registered", () => {
      setTick((t) => t + 1);
    });
    return unsub;
  }, [kernel]);

  const Component = kernel.slots.get(name);
  if (!Component) return <>{fallback}</>;

  return <Component {...(props as Record<string, unknown>)} />;
}