/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./projects/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8732fb',
          hover: '#9b52fc',
          active: '#761fe2',
          bg: '#f4eeff',
        },
      },
      borderRadius: {
        'cp': '12px',
      },
      boxShadow: {
        'cp': '0 12px 32px rgba(135, 50, 251, 0.1)',
      }
    },
  },
  plugins: [],
}
