// ─────────────────────────────────────────────────────────────────────────────
// App.tsx
// Bootstraps the kernel, registers all features, fires bootAll(), then
// renders the shell inside the KernelProvider.
//
// To add a new feature:
//   1. Create your feature definition (FeatureDefinition) in its feature folder.
//   2. kernel.register(yourFeature) below — that's it.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { Kernel, KernelProvider } from "@/core";
import { AppShell } from "@/shell/AppShell";

// ── Feature imports ───────────────────────────────────────────────────────────
import { tabsFeature }     from "@/features/tabs";
import { sidebarFeature }  from "@/features/sidebar";
import { notesFeature }    from "@/features/notes";
import { settingsFeature } from "@/features/settings";
import { libraryFeature }  from "@/features/library";
import { tauriSyncFeature } from "@/bridge/tauri-sync";

// ── Kernel singleton ──────────────────────────────────────────────────────────

const kernel = Kernel.getInstance();

// Register all features. Order doesn't matter — the kernel resolves deps.
kernel.register(tabsFeature);
kernel.register(sidebarFeature);
kernel.register(notesFeature);
kernel.register(settingsFeature);
kernel.register(libraryFeature);
kernel.register(tauriSyncFeature);

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const booted = useRef(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    kernel.bootAll().then(() => {
      // Trigger a re-render so useKernelReady() picks up the KERNEL_READY event
      // in case it fired synchronously before React committed.
      forceUpdate((n) => n + 1);
    });
  }, []);

  return (
    <KernelProvider kernel={kernel}>
      <AppShell />
    </KernelProvider>
  );
}
