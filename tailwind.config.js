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
        },
        // Risk tiers — readable on cream and on near-black
        tier: {
          low: '#12a067',
          med: '#e0930c',
          high: '#e4432d',
          crit: '#8b3fe0',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jbmono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 3px rgb(var(--ob-accent-rgb) / 0.18)',
        panel: '0 1px 0 rgb(var(--ob-shadow-rgb) / 0.04), 0 22px 44px -22px rgb(var(--ob-shadow-rgb) / 0.28)',
      },
    },
  },
  plugins: [],
};
