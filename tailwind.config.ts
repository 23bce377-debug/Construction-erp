import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          950: "#06080e",
          900: "#0b1020",
          850: "#11182b",
        },
        surface: {
          900: "#121a2d",
          800: "#18253f",
        },
        accent: {
          400: "#38bdf8",
          500: "#0ea5e9",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(56,189,248,0.25), 0 16px 50px rgba(3,7,18,0.55)",
      },
      backdropBlur: {
        xs: "2px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".glass": {
          background: "rgba(17, 24, 39, 0.42)",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        },
        ".glass-strong": {
          background: "rgba(15, 23, 42, 0.58)",
          border: "1px solid rgba(56, 189, 248, 0.22)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          boxShadow: "0 10px 40px rgba(2, 6, 23, 0.45)",
        },
      });
    }),
  ],
};

export default config;
