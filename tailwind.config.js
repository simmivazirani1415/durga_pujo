/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        burgundy: { DEFAULT: '#651B28', deep: '#4A121D', soft: '#7E2A38' },
        ivory: '#FFF6E8',
        gold: { DEFAULT: '#E7B958', deep: '#C9962F', soft: '#F2D38F' },
        vermilion: '#B93432',
        forest: '#344A3B',
        parchment: { DEFAULT: '#F3E5CE', deep: '#E8D4B3' },
        charcoal: '#252525',
        ink: { soft: '#5B4A45', mute: '#8A7770' },
      },
      fontFamily: {
        headline: ['"DM Serif Display"', 'Georgia', '"Times New Roman"', 'serif'],
        display: ['"Cormorant Garamond"', 'Cormorant', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        bangla: ['"Tiro Bangla"', '"Noto Serif Bengali"', 'serif'],
      },
      boxShadow: {
        panel: '0 24px 60px -20px rgba(43, 18, 14, 0.45), 0 2px 8px rgba(43, 18, 14, 0.12)',
        card: '0 1px 2px rgba(60, 30, 20, 0.08), 0 8px 24px -14px rgba(60, 30, 20, 0.35)',
      },
    },
  },
  plugins: [],
}
