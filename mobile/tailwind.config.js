/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: "#176B5B",
        accent: "#F4B942",
        ink: "#202522",
        muted: "#6B746F",
        surface: "#F7F8F6"
      }
    }
  },
  plugins: []
};