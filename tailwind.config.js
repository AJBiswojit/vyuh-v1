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
      /* The public-site palette uses a few half-steps that Tailwind's default
         scale (multiples of 5) does not emit. Without these, classes such as
         `bg-white/92` or `border-charcoal/8` compile to nothing and the element
         silently loses its surface or its hairline. */
      opacity: {
        8: '0.08',
        12: '0.12',
        18: '0.18',
        68: '0.68',
        72: '0.72',
        78: '0.78',
        92: '0.92',
        97: '0.97',
      },
    },
  },
  plugins: [],
}
