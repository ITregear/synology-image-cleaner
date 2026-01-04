/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sh-bg': '#0B0F1F',
        'sh-bg-secondary': '#141827',
        'sh-bg-tertiary': '#1C2033',
        'sh-surface': '#1F2637',
        'sh-surface-hover': '#262D42',
        'sh-primary': '#5B7CFF',
        'sh-primary-dark': '#4B6BED',
        'sh-primary-light': '#7A95FF',
        'sh-accent': '#8B5CF6',
        'sh-accent-light': '#A78BFA',
        'sh-text': '#ECEEF4',
        'sh-text-secondary': '#A6ADCD',
        'sh-text-muted': '#6B7299',
        'sh-text-dim': '#4A5174',
        'sh-border': '#252B3F',
        'sh-border-light': '#2F3548',
        'sh-success': '#10B981',
        'sh-success-light': '#34D399',
        'sh-warning': '#F59E0B',
        'sh-warning-light': '#FBBF24',
        'sh-error': '#EF4444',
        'sh-error-light': '#F87171',
        'sh-info': '#3B82F6',
        'sh-info-light': '#60A5FA',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'sh-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.35)',
        'sh': '0 4px 6px -1px rgba(0, 0, 0, 0.45), 0 2px 4px -1px rgba(0, 0, 0, 0.35)',
        'sh-md': '0 8px 12px -2px rgba(0, 0, 0, 0.45), 0 4px 6px -1px rgba(0, 0, 0, 0.35)',
        'sh-lg': '0 16px 24px -4px rgba(0, 0, 0, 0.55), 0 8px 12px -2px rgba(0, 0, 0, 0.45)',
        'sh-xl': '0 24px 48px -8px rgba(0, 0, 0, 0.65), 0 12px 24px -4px rgba(0, 0, 0, 0.55)',
        'sh-glow': '0 0 32px rgba(91, 124, 255, 0.35)',
        'sh-glow-accent': '0 0 32px rgba(139, 92, 246, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-out-right': 'slideOutRight 0.3s cubic-bezier(0.7, 0, 0.84, 0)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-in',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          from: { transform: 'translateX(0)', opacity: '1' },
          to: { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

