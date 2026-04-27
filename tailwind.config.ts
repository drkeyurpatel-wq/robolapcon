import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rlc: {
          bg: '#0f172a',
          'bg-light': '#1e293b',
          'bg-card': '#1a2744',
          accent: '#00A99D',
          'accent-light': '#00C9B7',
          amber: '#FDB913',
          red: '#E31E24',
          muted: '#94a3b8',
          border: '#334155',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
