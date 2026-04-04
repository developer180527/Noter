import { useState, useEffect } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

// Matches Tailwind's default breakpoints
const BREAKPOINTS = {
  mobile:  0,
  tablet:  640,
  desktop: 1024,
} as const;

function resolveBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.tablet)  return "mobile";
  if (width < BREAKPOINTS.desktop) return "tablet";
  return "desktop";
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() =>
    resolveBreakpoint(window.innerWidth)
  );

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setBp(resolveBreakpoint(entry.contentRect.width));
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  return bp;
}

export const useIsMobile  = () => useBreakpoint() === "mobile";
export const useIsTablet  = () => useBreakpoint() === "tablet";
export const useIsDesktop = () => useBreakpoint() === "desktop";

/** True for any non-mobile device — tab bar is shown. */
export const useHasTabs   = () => useBreakpoint() !== "mobile";
