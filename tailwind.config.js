/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surface hierarchy
        base:    "#0d0d0d",
        surface: "#131313",
        raised:  "#1a1a1a",
        overlay: "#212121",
        border:  "#2a2a2a",
        // Text
        ink:     "#e8e0d5",
        muted:   "#7a7370",
        subtle:  "#4a4846",
        // Accent
        amber:   "#d4903a",
        "amber-dim": "#8a5c1f",
        "amber-glow": "#f0b060",
        // Semantic
        danger:  "#c0392b",
        success: "#2ecc71",
      },
      fontFamily: {
        sans:  ["'Geist'", "system-ui", "sans-serif"],
        serif: ["'Crimson Pro'", "Georgia", "serif"],
        mono:  ["'Geist Mono'", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", "1rem"],
      },
      animation: {
        "fade-in":    "fadeIn 150ms ease-out",
        "slide-in-left": "slideInLeft 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "tab-enter":  "tabEnter 150ms ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideInLeft: {
          from: { transform: "translateX(-12px)", opacity: "0" },
          to:   { transform: "translateX(0)",     opacity: "1" },
        },
        tabEnter: {
          from: { transform: "translateY(4px)", opacity: "0" },
          to:   { transform: "translateY(0)",   opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
