import { useEffect, useRef, useState } from "react";
import { Kernel, KernelProvider, PluginManager } from "@/core";
import { AppShell } from "@/shell/AppShell";

import { tabsFeature }      from "@/features/tabs";
import { sidebarFeature }   from "@/features/sidebar";
import { notesFeature }     from "@/features/notes";
import { settingsFeature }  from "@/features/settings";
import { libraryFeature }   from "@/features/library";
import { tauriSyncFeature } from "@/bridge/tauri-sync";
import { exportFeature }    from "@/features/export";
import { canvasFeature }    from "@/features/canvas";

const kernel        = Kernel.getInstance();
const pluginManager = new PluginManager(kernel, kernel.events);
kernel.register(tabsFeature);
kernel.register(sidebarFeature);
kernel.register(notesFeature);
kernel.register(settingsFeature);
kernel.register(libraryFeature);
kernel.register(tauriSyncFeature);
kernel.register(exportFeature);
kernel.register(canvasFeature);

export default function App() {
  const booted = useRef(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    kernel.bootAll().then(() => forceUpdate((n) => n + 1));
  }, []);

  // ── Listen for plugin reload requests from PluginsSection ──────────────────
  useEffect(() => {
    const handler = () => {
      pluginManager.loadAll().catch(console.warn);
    };
    window.addEventListener("noter:reload-plugins", handler);
    return () => window.removeEventListener("noter:reload-plugins", handler);
  }, []);

  return (
    <KernelProvider kernel={kernel}>
      <AppShell />
    </KernelProvider>
  );
}