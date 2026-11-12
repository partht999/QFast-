import type { Config } from 'tailwindcss';

const ink = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e7e5e4',
  300: '#d6d3d1',
  400: '#a8a29e',
  500: '#78716c',
  600: '#57534e',
  700: '#44403c',
  800: '#292524',
  900: '#1c1917',
  950: '#0c0a09',
};

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: ink,
        slate: ink,
        neutral: ink,
        stone: ink,
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      fontWeight: {
        medium: '500',
        semibold: '600',
        bold: '600',
        extrabold: '600',
        black: '640',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        // Tailwind v4 names that the codebase already uses; define them for v3
        xs: '0 1px 2px 0 rgb(12 10 9 / 0.05)',
        soft: '0 1px 2px rgb(12 10 9 / 0.04), 0 4px 16px -4px rgb(12 10 9 / 0.08)',
        lift: '0 2px 4px rgb(12 10 9 / 0.04), 0 12px 32px -8px rgb(12 10 9 / 0.14)',
        glow: '0 8px 30px -6px rgb(249 115 22 / 0.45)',
      },
      borderWidth: {
        3: '3px',
      },
      scale: {
        98: '0.98',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'ping-soft': {
          '75%, 100%': { transform: 'scale(2.2)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'ping-soft': 'ping-soft 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
