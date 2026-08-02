/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B0E",
        "bg-elev": "#161619",
        "bg-elev-2": "#1F1F24",
        border: "#2A2A30",
        "text-primary": "#F5F5F7",
        "text-secondary": "#A8A8B0",
        "text-tertiary": "#6A6A72",
        accent: "#F24E4E",
        "accent-dim": "#7E2828",
        success: "#5BD68F",
        warning: "#F5A623",
      },
      fontFamily: {
        sans: ["Inter", "System"],
        body: ["Inter", "System"],
        display: ["Geist", "Inter", "System"],
      },
    },
  },
  plugins: [],
};