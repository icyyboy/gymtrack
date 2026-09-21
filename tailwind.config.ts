import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08090B',
          900: '#0D0F12',
          850: '#121418',
          800: '#171A1F',
          700: '#22262D',
          600: '#2E333C',
          500: '#3D434E'
        },
        muted: {
          DEFAULT: '#8A919E',
          strong: '#B6BCC7'
        },
        accent: {
          DEFAULT: '#2FD671',
          soft: 'rgba(47,214,113,0.12)',
          dim: '#1C9B50'
        },
        danger: '#F05252',
        warn: '#F5A524'
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        num: ['var(--font-num)', 'ui-monospace', 'monospace']
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px'
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'slide-up': 'slide-up .2s ease-out'
      }
    }
  },
  plugins: []
}

export default config
