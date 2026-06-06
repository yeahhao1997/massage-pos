/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 温泉养生 · 鼠尾草绿 / spa sage green
        brand: {
          50: '#f4f7f3', 100: '#e6ede3', 200: '#cddbc8', 300: '#a9c0a1',
          400: '#86a37b', 500: '#688a5d', 600: '#557048', 700: '#45593b', 800: '#39482f',
        },
        cream: '#f6f4ed', // 米白背景
      },
    },
  },
  plugins: [],
};
