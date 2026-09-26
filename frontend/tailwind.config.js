/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#090909',
          surface: '#0F0F0F',
          card: '#141414',
          border: '#1F1F1F',
          borderLight: '#2C2C2C',
          text: '#F1F0EA',
          muted: '#858585',
          dim: '#4A4A4A',
          lime: '#B7FF2A',
          limeHover: '#CBFF4D',
          limeDim: 'rgba(183, 255, 42, 0.08)',
          limeBorder: 'rgba(183, 255, 42, 0.25)',
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', '"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '6px',
      }
    },
  },
  plugins: [],
};
