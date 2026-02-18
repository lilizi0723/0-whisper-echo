/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./types.ts",
    "./constants.ts",
    "./components/**/*.tsx",
    "./services/**/*.ts",
    "./utils/**/*.ts",
  ],
  theme: {
    extend: {
      colors: { paper: '#FAF7F2', card: '#F0EBE0', ink: '#1a1a1a', subtext: '#8B8B8B', sage: '#A7B89E', clay: '#D4C5B5' },
      fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'], serif: ['Playfair Display', 'serif'] },
      animation: { 'spin-slow': 'spin 20s linear infinite', 'float': 'float 6s ease-in-out infinite' },
      keyframes: { float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } } },
    },
  },
  plugins: [],
};
