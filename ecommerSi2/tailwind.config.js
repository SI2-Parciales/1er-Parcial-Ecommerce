/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0F172A",
          secondary: "#F8FAFC",
          accent: "#2563EB",
          muted: "#64748B",
          border: "#E2E8F0",
          danger: "#DC2626",
          success: "#059669",
          warning: "#D97706",
          surface: "#FFFFFF",
          card: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
