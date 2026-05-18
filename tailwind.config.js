/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base:    "var(--color-base)",
        surface: "var(--color-surface)",
        raised:  "var(--color-raised)",
        overlay: "var(--color-overlay)",
        border:  "var(--color-border)",
        ink:     "var(--color-ink)",
        muted:   "var(--color-muted)",
        subtle:  "var(--color-subtle)",
        amber:        "var(--color-amber)",
        "amber-dim":  "var(--color-amber-dim)",
        "amber-glow": "var(--color-amber-glow)",
        danger:  "var(--color-danger)",
        success: "var(--color-success)",
      },
      fontFamily: {
        sans:  ["'Geist'",       "system-ui", "sans-serif"],
        serif: ["'Crimson Pro'", "Georgia",   "serif"],
        mono:  ["'Geist Mono'",  "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", "1rem"],
      },
      animation: {
        "fade-in":       "fadeIn 150ms ease-out",
        "slide-in-left": "slideInLeft 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "tab-enter":     "tabEnter 150ms ease-out",
      },
      keyframes: {
        fadeIn:      { from: { opacity: "0" }, to: { opacity: "1" } },
        slideInLeft: { from: { transform: "translateX(-12px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        tabEnter:    { from: { transform: "translateY(4px)",  opacity: "0" }, to: { transform: "translateY(0)",  opacity: "1" } },
      },
    },
  },
  plugins: [],
};