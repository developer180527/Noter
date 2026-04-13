// noter is a desktop-only Tauri app.
// Tauri enforces minWidth: 640 / minHeight: 480 at the OS level.
// We always render the desktop layout — no mobile/tablet switching.

export type Breakpoint = "desktop";

export function useBreakpoint(): Breakpoint { return "desktop"; }

export const useIsMobile  = () => false;
export const useIsTablet  = () => false;
export const useIsDesktop = () => true;
export const useHasTabs   = () => true;