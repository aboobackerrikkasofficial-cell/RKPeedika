/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0B1B2B",
        primaryDark: "#071320",
        secondary: "#F5A623",
        charcoal: "#1A1A1A",
        borderLight: "#EDEDED",
      },
      borderRadius: {
        premium: "12px",
      },
      boxShadow: {
        premium: "0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03)",
        premiumHover: "0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.05)",
      }
    },
  },
  plugins: [],
}
