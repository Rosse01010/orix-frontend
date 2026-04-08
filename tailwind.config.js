/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "475px",
      },
      colors: {
        orix: {
          bg: "#09090b",
          surface: "#18181b",
          border: "#27272a",
          accent: "#3b82f6",
          danger: "#dc2626",
          success: "#16a34a",
        },
      },
    },
  },
  plugins: [],
};
