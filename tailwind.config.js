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
        // Risk tiers (luminous on dark)
        tier: {
          low: '#34d399',
          med: '#f5b14c',
          high: '#ff5d5d',
          crit: '#c084fc',
        },
      },
      fontFamily: {
        serif: ['var(--font-dm-serif)', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jbmono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(76,194,255,0.25), 0 0 24px -4px rgba(76,194,255,0.35)',
        panel: '0 24px 60px -20px rgba(0,0,0,0.7)',
      },
    },
  },
  plugins: [],
};
