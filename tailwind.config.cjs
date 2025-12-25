module.exports = {
  // Restrict content scanning to only application source files to avoid
  // accidentally scanning node_modules and slow builds.
  content: [
    './index.html',
    './App.{js,ts,jsx,tsx}',
    './index.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './views/**/*.{js,ts,jsx,tsx}',
    './context/**/*.{js,ts,jsx,tsx}',
    './components/**/*',
    './views/**/*'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-primary) / 0.8)'
        },
        sidebar: 'rgb(var(--color-sidebar) / <alpha-value>)',
        background: '#F3F4F6',
        card: '#FFFFFF'
      },
      borderRadius: {
        none: '0',
        sm: 'calc(var(--app-radius) * 0.5)',
        md: 'calc(var(--app-radius) * 0.75)',
        lg: 'var(--app-radius)',
        xl: 'calc(var(--app-radius) * 1.5)',
        '2xl': 'calc(var(--app-radius) * 2)',
        full: '9999px'
      }
    },
  },
  plugins: [],
};
