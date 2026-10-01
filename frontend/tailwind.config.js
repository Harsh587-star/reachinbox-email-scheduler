/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: "#E8EEF5",
          surface: "#F3F7FA",
          card: "#FFFFFF",
          primary: "#6366F1",
          primaryLight: "#818CF8",
          primaryDark: "#4F46E5",
          accent: "#EC4899",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
        }
      },
      boxShadow: {
        'clay-card': '8px 8px 16px #d1d9e6, -8px -8px 16px #ffffff',
        'clay-card-hover': '12px 12px 24px #cbd5e1, -12px -12px 24px #ffffff',
        'clay-btn': '5px 5px 10px #d1d9e6, -5px -5px 10px #ffffff',
        'clay-btn-pressed': 'inset 4px 4px 8px #d1d9e6, inset -4px -4px 8px #ffffff',
        'clay-primary': '6px 6px 14px rgba(99, 102, 241, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.8), inset 2px 2px 4px rgba(255, 255, 255, 0.4)',
        'clay-inset': 'inset 3px 3px 6px #d1d9e6, inset -3px -3px 6px #ffffff',
      },
      borderRadius: {
        'clay': '20px',
        'clay-sm': '14px',
        'clay-lg': '28px',
      }
    },
  },
  plugins: [],
}
