/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Obsidian surfaces — CSS-var driven so the light/dark toggle works.
        ob: {
          bg: 'rgb(var(--ob-bg-rgb) / <alpha-value>)',
          bg2: 'rgb(var(--ob-bg2-rgb) / <alpha-value>)',
          surface: 'rgb(var(--ob-surface-rgb) / <alpha-value>)',
          surface2: 'rgb(var(--ob-surface2-rgb) / <alpha-value>)',
          border: 'rgb(var(--ob-border-rgb) / <alpha-value>)',
          text: 'rgb(var(--ob-text-rgb) / <alpha-value>)',
          muted: 'rgb(var(--ob-muted-rgb) / <alpha-value>)',
          faint: 'rgb(var(--ob-faint-rgb) / <alpha-value>)',
          accent: 'rgb(var(--ob-accent-rgb) / <alpha-value>)',
          water: 'rgb(var(--ob-water-rgb) / <alpha-value>)',
          onaccent: 'rgb(var(--ob-onaccent-rgb) / <alpha-value>)',
        },
        // Risk tier fills; theme-aware (see globals.css). Small text uses the
        // TIER_INK variables instead.
        tier: {
          low: 'rgb(var(--tier-low-rgb) / <alpha-value>)',
          med: 'rgb(var(--tier-med-rgb) / <alpha-value>)',
          high: 'rgb(var(--tier-high-rgb) / <alpha-value>)',
          crit: 'rgb(var(--tier-crit-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-jbmono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
};
