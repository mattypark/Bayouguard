/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cs-navy':      '#1A4480',
        'cs-navy-lt':   '#E3EDFF',
        'cs-teal':      '#00939A',
        'cs-teal-lt':   '#D6F2F3',
        'cs-sky':       '#F0F5FF',
        'cs-midnight':  '#1A1A2E',
        'cs-steel':     '#4A6FA5',
        'cs-amber':     '#E8962A',
        'cs-amber-lt':  '#FFF3E0',
        'cs-border':    '#CDD8ED',
        'risk-low':     '#1B5E20',
        'risk-low-lt':  '#E8F5E9',
        'risk-med':     '#E65100',
        'risk-med-lt':  '#FFF3E0',
        'risk-high':    '#B71C1C',
        'risk-high-lt': '#FFEBEE',
        'risk-crit':    '#4A148C',
        'risk-crit-lt': '#F3E5F5',
      },
      fontFamily: {
        serif: ['var(--font-dm-serif)', 'serif'],
        sans:  ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
