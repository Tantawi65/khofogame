/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'egyptian-gold': '#d4a843',
        'egyptian-brown': '#8b4513',
        'papyrus': '#f5f5dc',
        'sand': '#c2b280',
        'nile-blue': '#1a3a5c',
        'mummy-red': '#8b0000',
      },
      fontFamily: {
        'game': ['Cinzel', 'serif'],
      },
      animation: {
        'card-flip': 'cardFlip 0.6s ease-in-out',
        'card-glow': 'cardGlow 1.5s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'pulse-danger': 'pulseDanger 1s ease-in-out infinite',
      },
      keyframes: {
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        cardGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(212, 168, 67, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(212, 168, 67, 0.8)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        pulseDanger: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(139, 0, 0, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(139, 0, 0, 1)' },
        },
      },
    },
  },
  plugins: [],
}
