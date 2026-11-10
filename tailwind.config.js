/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sky: '#AED9F0',
        cream: '#F5F0DF',
        charcoal: '#242729',
      },
      fontFamily: {
        serif: ['"Zodiak"', '"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Switzer"', '"Gilroy"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px -18px rgba(36,39,41,0.18)',
        float: '0 18px 45px -22px rgba(36,39,41,0.25)',
      },
      transitionTimingFunction: {
        calm: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
