/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind v4 uses @import "tailwindcss" in CSS — this config is for
  // dark mode class strategy and any v3-compat plugins only
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#f97316",
          charcoal: "#1c1917", // Changed from #111827 to a warmer stone-black for better harmony
          cream: "#fff7ed",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
