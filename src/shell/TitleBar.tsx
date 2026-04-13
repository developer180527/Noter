import { useEffect, useState } from "react";
import { Minus, Square, X } from "lucide-react";

const isMac = navigator.userAgent.includes("Mac");

async function getWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

function WinControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getWindow().then(async (win) => {
      setMaximized(await win.isMaximized());
      unlisten = await win.onResized(async () => {
        setMaximized(await win.isMaximized());
      });
    });
    return () => { unlisten?.(); };
  }, []);

  const WinBtn = ({
    onClick, danger, children,
  }: {
    onClick: () => void;
    danger?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-center w-10 h-full text-subtle
        hover:text-ink transition-colors
        ${danger ? "hover:bg-red-600 hover:text-white" : "hover:bg-raised"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-stretch h-full shrink-0">
      <WinBtn onClick={() => getWindow().then(w => w.minimize())}>
        <Minus size={11} strokeWidth={1.5} />
      </WinBtn>
      <WinBtn onClick={() => getWindow().then(w => w.toggleMaximize())}>
        <Square size={10} strokeWidth={1.5} style={{ borderRadius: maximized ? 2 : 0 }} />
      </WinBtn>
      <WinBtn onClick={() => getWindow().then(w => w.close())} danger>
        <X size={11} strokeWidth={1.5} />
      </WinBtn>
    </div>
  );
}

export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="flex items-center h-9 shrink-0 bg-base border-b border-border
                 select-none z-50 relative"
      style={{ paddingLeft: isMac ? 80 : 0 }}
    >
      <div className="flex-1 flex items-center justify-center" data-tauri-drag-region>
        <span className="text-2xs font-mono text-subtle/60 tracking-widest uppercase pointer-events-none">
          noter
        </span>
      </div>

      {!isMac && <WinControls />}
      {isMac  && <div className="w-20 shrink-0" data-tauri-drag-region />}
    </div>
  );
}