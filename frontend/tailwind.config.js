/** @type {import('tailwindcss').Config} */
// Colours are CSS variables (see src/index.css) so the accent colour can change at runtime.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'rgb(var(--accent) / <alpha-value>)',
        violet: 'rgb(var(--violet) / <alpha-value>)',
        ok: 'rgb(var(--success) / <alpha-value>)',
        warn: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        ink: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Figtree Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Sora Variable"', '"Figtree Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { glass: '24px', 'glass-lg': '28px' },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        scaleIn: { from: { opacity: 0, transform: 'translateY(10px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        slideIn: { from: { opacity: 0, transform: 'translateX(24px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        ping2: { '0%': { transform: 'scale(1)', opacity: 0.7 }, '80%,100%': { transform: 'scale(2.4)', opacity: 0 } },
        scan: { '0%': { transform: 'translateY(-10%)' }, '100%': { transform: 'translateY(110%)' } },
      },
      animation: {
        'fade-in': 'fadeIn .45s ease-out both',
        'scale-in': 'scaleIn .25s ease-out both',
        'slide-in': 'slideIn .3s ease-out both',
        ping2: 'ping2 1.8s cubic-bezier(0,0,.2,1) infinite',
        scan: 'scan 2.2s linear infinite',
      },
    },
  },
  plugins: [],
}
