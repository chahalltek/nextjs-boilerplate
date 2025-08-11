/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,md,mdx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        skol: {
          purple: "#4F2683",
          gold: "#FFC62F",
        },
      },
      container: {
        center: true,
        padding: "1rem",
        screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
      },
      borderRadius: { '2xl': '1rem' }
    },
  },
  plugins: [],
};