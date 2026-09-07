import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'Inter', 'Nunito', 'sans-serif'],
      },
      colors: {
        // Modern Skeuomorphic palette
        milk: '#F5F0EB',
        surface: '#FAFAF8',
        accent: {
          DEFAULT: '#D72638',
          hover: '#B01C2E',
          soft: '#FDECEF',
        },
        'deep-black': '#1A1A1A',
        'muted-line': '#E0DEDA',
        'inset-bg': '#EDEBE8',
        brand: {
          50: '#fdf2f4',
          100: '#fde5e8',
          500: '#D72638',
          600: '#D72638',
          700: '#B01C2E',
          800: '#8A1523',
          900: '#640E19',
        },
        navy: {
          800: '#2A2A2A',
          900: '#D72638', // Header bar color mapped to primary accent
        },
        gold: {
          400: '#FFFFFF',
          500: '#F5F0EB',
          600: '#E0DEDA',
          700: '#D72638',
        }
      },
      boxShadow: {
        'clay': '6px 6px 14px rgba(0,0,0,0.12), -4px -4px 10px rgba(255,255,255,0.85)',
        'clay-lg': '8px 8px 22px rgba(0,0,0,0.14), -6px -6px 16px rgba(255,255,255,0.9)',
        'clay-sm': '3px 3px 8px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.9)',
        'clay-inset': 'inset 3px 3px 8px rgba(0,0,0,0.09), inset -2px -2px 6px rgba(255,255,255,0.9)',
        'clay-btn': '4px 4px 10px rgba(215, 38, 56, 0.35), -2px -2px 6px rgba(255, 255, 255, 0.7)',
        'clay-btn-active': 'inset 3px 3px 8px rgba(0,0,0,0.25), inset -2px -2px 6px rgba(255,255,255,0.2)',
      },
      borderRadius: {
        'clay-sm': '12px',
        'clay': '18px',
        'clay-lg': '24px',
      }
    },
  },
  plugins: [],
};

export default config;
