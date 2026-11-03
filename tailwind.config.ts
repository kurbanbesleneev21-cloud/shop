import type { Config } from "tailwindcss";

const mix = (v: string, pct: number, other = "white") => `color-mix(in srgb, rgb(var(${v})) ${pct}%, ${other})`;

// Strict 3-colour palette: ink (#111111), white (#FFFFFF), brand blue (#2563EB) and their tints/shades only.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "rgb(var(--bg) / <alpha-value>)",
      ink: {
        DEFAULT: "rgb(var(--ink) / <alpha-value>)",
        50: mix("--ink", 3, "rgb(var(--bg))"),
        100: mix("--ink", 6, "rgb(var(--bg))"),
        200: mix("--ink", 12, "rgb(var(--bg))"),
        300: mix("--ink", 22, "rgb(var(--bg))"),
        400: mix("--ink", 54, "rgb(var(--bg))"), // ≥4.5:1 on white (WCAG AA text)
        500: mix("--ink", 58, "rgb(var(--bg))"),
        600: mix("--ink", 72, "rgb(var(--bg))"),
        700: mix("--ink", 86, "rgb(var(--bg))"),
      },
      brand: {
        DEFAULT: "rgb(var(--brand) / <alpha-value>)",
        50: mix("--brand", 7),
        100: mix("--brand", 14),
        200: mix("--brand", 26),
        300: mix("--brand", 45),
        400: mix("--brand", 72),
        600: mix("--brand", 85, "black"),
        700: mix("--brand", 70, "black"),
        800: mix("--brand", 55, "black"),
      },
    },
    extend: {
      fontFamily: { sans: ["var(--font)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"] },
      borderRadius: { card: "var(--radius)", btn: "calc(var(--radius) * 0.75)" },
      boxShadow: {
        card: "0 1px 2px rgb(var(--ink) / 0.04), 0 4px 16px rgb(var(--ink) / 0.06)",
        lift: "0 10px 30px rgb(var(--ink) / 0.10)",
        brand: "0 8px 24px rgb(var(--brand) / 0.25)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        pageIn: { from: { opacity: "0.4" }, to: { opacity: "1" } },
        fadeUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        pop: { "0%": { transform: "scale(1)" }, "40%": { transform: "scale(1.35)" }, "100%": { transform: "scale(1)" } },
        draw: { from: { strokeDashoffset: "var(--len, 2000)" }, to: { strokeDashoffset: "0" } },
        grow: { from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite",
        "page-in": "pageIn .2s ease-out", // no fill-mode: a filled opacity animation would create a stacking context and trap z-index of sheets
        "fade-up": "fadeUp .45s cubic-bezier(.2,.7,.2,1) both",
        pop: "pop .45s ease",
        draw: "draw 1.2s ease-out both",
        grow: "grow .7s cubic-bezier(.2,.7,.2,1) both",
      },
      screens: { xs: "380px" },
    },
  },
  plugins: [],
};
export default config;
