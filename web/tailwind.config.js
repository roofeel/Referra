import forms from '@tailwindcss/forms'
import containerQueries from '@tailwindcss/container-queries'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#137fec',
        'brand-teal': '#14b8a6',
        'soft-blue': '#f0f9ff',
        'slate-light': '#f8fafc',
        accent: '#0369a1',
        'background-light': '#f6f7f8',
        'background-dark': '#101922',
        'card-dark': '#1a242f',
        'neutral-dark': '#1e293b',
      },
      fontFamily: {
        display: ['Inter'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [forms, containerQueries],
}
