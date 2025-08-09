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
          50: '#f2fbfa',
          100: '#e0f7f4',
          200: '#b3ebe2',
          300: '#80ddce',
          400: '#3fcdba',
          500: '#00A693',
          600: '#009480',
          700: '#007c6b',
          800: '#006858',
          900: '#005346'
        }
      },
      boxShadow: {
        soft: '0 10px 20px -10px rgba(0, 166, 147, 0.35)'
      }
    },
  },
  plugins: [],
}

