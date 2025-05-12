/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark-indigo': '#111827',
        'logo-beige': '#a07d5e'
      },
    },
  },
  plugins: [],
};