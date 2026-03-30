import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        hand: ['Caveat', 'cursive'],
      },
      colors: {
        paper: '#faf5ea',
        'paper-dark': '#f0e8d0',
        ink: '#2c1a0e',
        'ink-light': '#7a5c44',
        margin: '#e07070',
        rule: '#ddd0b8',
      },
    },
  },
  plugins: [],
}

export default config
