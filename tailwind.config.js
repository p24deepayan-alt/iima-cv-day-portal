/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        iima: {
          // Official-style branding
          blue: '#002147', // Yale Blue / Academic Deep Blue
          lightBlue: '#003366',
          red: '#A63437', // Louis Kahn Brick Red
          redHover: '#8A2B2E',
          gold: '#C5A059', // Muted Gold accent
          warm: '#F9F8F4', // Warm paper/stone background
          gray: '#E5E7EB'
        }
      },
      borderRadius: {
        'iima': '2px', // Sharper corners for academic feel
      }
    },
  },
  plugins: [],
}
