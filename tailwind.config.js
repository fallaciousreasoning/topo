const colors = require('tailwindcss/colors');

module.exports = {
  content: [
    "./src/**/*.tsx",
    "./src/**/*.ts",
    "./public/**/*.html",
    "./public/**/*.css",
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: colors.purple['700'],
          hover: colors.purple['600']
        },
        secondary: {
          DEFAULT: colors.orange['700'],
          hover: colors.orange['600']
        },
        background: {
          DEFAULT: colors.white,
          hover: colors.gray['200']
        },
        foreground: colors.black
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['active'],
      textColor: ['active']
    },
  },
  plugins: [],
}
