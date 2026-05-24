/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        boutique: {
          ink: '#1c1917',
          paper: '#fafaf9',
          accent: '#9a3412',
          accentSoft: '#fed7aa',
          mute: '#78716c',
          line: '#e7e5e4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
