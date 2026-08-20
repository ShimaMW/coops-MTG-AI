import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        clover: {
          50: '#f0f5f5',
          100: '#dce6e7',
          200: '#bcced0',
          300: '#94b0b3',
          400: '#698e93',
          500: '#4e7378',
          600: '#3d5c61',
          700: '#354045',
          800: '#2a3338',
          900: '#1d2327',
          950: '#111518',
        }
      }
    },
  },
  plugins: [],
} satisfies Config;
