/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2fbff',
          100: '#e4f6ff',
          200: '#c1ecff',
          300: '#8edcff',
          400: '#4bc1ff',
          500: '#16a6ff',
          600: '#0686e0',
          700: '#066ab3',
          800: '#0a578f',
          900: '#0e4a77'
        }
      }
    },
  },
  plugins: [],
}

