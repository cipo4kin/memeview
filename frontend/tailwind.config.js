/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        trade: {
          bg: '#0d0e12',
          card: '#16181e',
          border: '#232733',
          green: '#10b981',
          red: '#ef4444',
          accent: '#3b82f6',
        }
      }
    },
  },
  plugins: [],
}