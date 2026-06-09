/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // ✅ Tambahkan ini
  theme: {
    extend: {
      colors: {
        primary: "#0d6efd",
        success: "#198754",
        danger: "#dc3545",
        warning: "#ffc107",
      },
    },
  },
  plugins: [],
};
