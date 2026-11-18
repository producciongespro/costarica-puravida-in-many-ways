/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        amaranth: ['Amaranth', 'sans-serif'],
        exo: ['Exo2', 'sans-serif'],
        fredoka: ['FredokaOne', 'cursive', 'sans-serif'],
        hanken: ['Hanken', 'sans-serif'],
        opensans: ['OpenSans', 'sans-serif']
      },
      colors: {
        crBlue: '#479BD6',
        crDark: '#231F20',
        crGold: '#F2A830',
        crGreen: '#3F9D21'
      }
    }
  },
  plugins: []
};
