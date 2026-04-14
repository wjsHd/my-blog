import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF9',
        primary: '#1A1A1A',
        accent: '#C09060',
        'accent-light': '#D4AA80',
        'accent-dark': '#A07040',
        border: '#E5E5E3',
        muted: '#6B6B6B',
        'muted-light': '#9A9A9A',
        surface: '#FFFFFF',
        'surface-hover': '#F5F5F3',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['Inter', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'heading': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        'card': '10px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)',
        'dropdown': '0 8px 24px rgba(0,0,0,0.10)',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#1A1A1A',
            fontFamily: 'Inter, "Noto Sans SC", system-ui, sans-serif',
            lineHeight: '1.8',
            fontSize: '1.0625rem',
            h1: {
              fontFamily: '"Noto Serif SC", Georgia, serif',
              color: '#1A1A1A',
              fontWeight: '700',
            },
            h2: {
              fontFamily: '"Noto Serif SC", Georgia, serif',
              color: '#1A1A1A',
              fontWeight: '600',
              marginTop: '2em',
              marginBottom: '0.75em',
            },
            h3: {
              fontFamily: '"Noto Serif SC", Georgia, serif',
              color: '#1A1A1A',
              fontWeight: '600',
            },
            a: {
              color: '#C09060',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            blockquote: {
              borderLeftColor: '#C09060',
              color: '#6B6B6B',
              fontStyle: 'italic',
            },
            code: {
              color: '#C09060',
              backgroundColor: '#F5F5F3',
              padding: '0.15em 0.35em',
              borderRadius: '4px',
              fontWeight: '400',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            pre: {
              backgroundColor: '#1A1A1A',
              color: '#E5E5E3',
            },
          },
        },
      },
    },
  },
  plugins: [],
}

export default config
