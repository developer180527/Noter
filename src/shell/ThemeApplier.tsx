// src/shell/ThemeApplier.tsx
// Sits once in AppShell. Subscribes to the theme store.
// On change: writes data-theme to <html> and updates color-scheme meta.
// useLayoutEffect fires synchronously before paint — no flash of wrong theme.

import { useLayoutEffect } from "react";
import { useThemeStore }   from "@/features/settings/theme.store";
import { THEMES }          from "@/features/settings/themes";

export function ThemeApplier() {
  const activeTheme = useThemeStore((s) => s.activeTheme);

  useLayoutEffect(() => {
    const theme = THEMES.find((t) => t.id === activeTheme);
    if (!theme) return;

    // Set data-theme attribute — triggers CSS variable overrides
    document.documentElement.setAttribute("data-theme", theme.id);

    // Update color-scheme so the browser uses the right native UI colors
    // (scrollbars, input backgrounds, form controls)
    document.documentElement.style.colorScheme = theme.dark ? "dark" : "light";
  }, [activeTheme]);

  // Renders nothing — pure DOM side-effect
  return null;
}