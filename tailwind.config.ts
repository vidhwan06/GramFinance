import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paper background — the document-like base
        paper: '#F7F6F2',
        // Primary ink — the dominant text color
        ink: '#182437',
        // Muted ink — secondary/tertiary text
        'muted-ink': '#5B6472',
        // Rule / border color — hairline rules and dividers
        rule: '#D8D4C9',
        // Seal red — reserved for verification, actions, CTAs, active states
        'seal-red': '#8C2E22',
        // Eligible — semantic green for pass/satisfied states
        eligible: '#2F6B4F',
        // Unknown — semantic ochre for uncertain/incomplete states
        unknown: '#A87A1E',
        // Background/foreground CSS variable references
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
    },
  },
  plugins: [],
};
export default config;
