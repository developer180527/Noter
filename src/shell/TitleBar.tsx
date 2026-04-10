// ─────────────────────────────────────────────────────────────────────────────
// TitleBar
// A thin 36px strip spanning the full window width.
// Left zone (80px): traffic lights live here — empty, no content.
// Center: app name "noter".
// Right: status indicators (reserved for future use).
// The entire bar is data-tauri-drag-region so the window is draggable.
// ─────────────────────────────────────────────────────────────────────────────

export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="flex items-center h-9 shrink-0 bg-base border-b border-border
                 select-none z-50 relative"
    >
      <div className="w-16 shrink-0" data-tauri-drag-region />

      {/* App name */}
      <div className="flex-1 flex items-center justify-center" data-tauri-drag-region>
        <span className="text-2xs font-mono text-subtle/60 tracking-widest uppercase">
          noter
        </span>
      </div>

      <div className="w-16 shrink-0" data-tauri-drag-region />
    </div>
  );
}