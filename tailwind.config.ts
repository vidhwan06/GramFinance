import type { Config } from "tailwindcss";

// Text-style names from the final Stitch package. Each maps to the same
// Noto Sans stack so `font-headline-lg` etc. resolve like the reference.
const STITCH_TEXT_STYLES = [
  "label-sm",
  "label-md",
  "label-lg",
  "body-sm",
  "body-md",
  "body-lg",
  "title-md",
  "title-lg",
  "headline-sm",
  "headline-md",
  "headline-lg",
  "headline-lg-mobile",
  "headline-xl",
  "headline-xl-mobile",
] as const;

const stitchFontFamily: Record<string, string[]> = Object.fromEntries(
  STITCH_TEXT_STYLES.map((name) => [
    name,
    ["var(--font-noto-sans)", "system-ui", "-apple-system", "sans-serif"],
  ])
);

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Stitch semantic tokens (final package) ─────────────────────────
        // Surfaces. `surface` is aligned to the required Warm Ivory #F7F5EF
        // (the package's #fbf9f3 differs by ~2% luminance) so legacy
        // `bg-warm-ivory` and new `bg-surface` never form a visible seam.
        surface: {
          DEFAULT: "#F7F5EF",
          container: "#f0eee8",
          "container-low": "#f5f3ed",
          "container-lowest": "#ffffff",
          "container-high": "#eae8e2",
          "container-highest": "#e4e2dd",
          variant: "#e4e2dd",
          dim: "#dcdad4",
          bright: "#F7F5EF",
        },
        "on-surface": "#1b1c18",
        "on-surface-variant": "#4a454c",
        outline: {
          DEFAULT: "#7c757d",
          variant: "#ccc4cd",
        },
        "primary-container": "#24152f",
        "on-primary-container": "#917d9d",
        secondary: {
          DEFAULT: "#146965",
          "on-secondary": "#ffffff",
          fixed: "#a5f0ea",
          "fixed-dim": "#89d4ce",
          "on-fixed": "#00201e",
          "on-fixed-variant": "#00504d",
          container: "#a5f0ea",
          "on-container": "#1e6f6b",
        },
        "on-secondary": "#ffffff",
        "secondary-fixed": "#a5f0ea",
        "on-secondary-fixed": "#00201e",
        "tertiary-fixed": "#dced5f",
        "tertiary-fixed-dim": "#c0d046",
        "on-tertiary-fixed": "#1a1e00",
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "inverse-surface": "#30312d",
        "inverse-on-surface": "#f3f1eb",

        // ── GramFinance Final Design System — required palette ─────────────
        aubergine: "#24152F",
        "deep-plum": "#34203F",
        "warm-ivory": "#F7F5EF",
        "signature-lime": "#D7E85B",
        "deep-teal": "#176B67",
        coral: {
          DEFAULT: "#D96B55",
          // Deep coral — AA-contrast shade for text, links and CTA fills
          700: "#B4472F",
        },
        stone: "#D9D5CC",
        charcoal: "#1B1B20",
        muted: "#706D75",

        // Semantic aliases for existing components (mapped to new palette)
        // Paper background — the document-like base
        paper: "#F7F5EF",
        // Primary ink — the dominant text color
        ink: "#1B1B20",
        // Muted ink — secondary/tertiary text
        "muted-ink": "#706D75",
        // Rule / border color — hairline rules and dividers
        rule: "#D9D5CC",
        // Seal red — reserved for verification, actions, CTAs, active states.
        // Points at the deep coral shade (5.4:1 on white) so links, CTA fills
        // and white-on-coral button labels all pass WCAG AA.
        "seal-red": "#B4472F",
        // Eligible — semantic green for pass/satisfied states (mapped to deep-teal)
        eligible: "#176B67",
        // Unknown — semantic ochre for uncertain/incomplete states
        unknown: "#A87A1E",
        // Background/foreground CSS variable references
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        danger: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
      },
      fontFamily: {
        sans: ["var(--font-noto-sans)", "system-ui", "-apple-system", "sans-serif"],
        kannada: ["var(--font-noto-sans-kannada)", "var(--font-noto-sans)", "system-ui", "sans-serif"],
        ...stitchFontFamily,
      },
      // Type scale from the final Stitch package (Noto Sans throughout).
      fontSize: {
        "label-sm": ["11px", { lineHeight: "14px", fontWeight: "500" }],
        "label-md": ["12px", { lineHeight: "16px", fontWeight: "600" }],
        "label-lg": ["14px", { lineHeight: "20px", fontWeight: "600" }],
        "body-sm": ["13px", { lineHeight: "20px", fontWeight: "400" }],
        "body-md": ["15px", { lineHeight: "24px", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "title-md": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "title-lg": ["18px", { lineHeight: "26px", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "headline-xl": ["40px", { lineHeight: "48px", fontWeight: "700" }],
        "headline-xl-mobile": ["30px", { lineHeight: "36px", fontWeight: "700" }],
      },
      // Spacing names from the final Stitch package (`px-margin`,
      // `py-space-xl`, `gap-space-lg` …). Values match Tailwind's scale so
      // `px-margin` ≈ `px-12`, `space-xl` ≈ 2.5rem, etc.
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.5rem",
        margin: "3rem",
        "margin-mobile": "1rem",
        gutter: "1.5rem",
        "gutter-mobile": "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
