/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Semantic Backgrounds (Apple iOS) ──
        "ios-bg": {
          primary: "#F2F2F7",       // systemGroupedBackground
          secondary: "#FFFFFF",     // card bg
          tertiary: "#F2F2F7",
        },
        "ios-bg-dark": {
          primary: "#000000",
          secondary: "#1C1C1E",
          tertiary: "#2C2C2E",
        },

        // ── System Colors (Apple iOS light) ──
        "ios-blue": "#007AFF",
        "ios-green": "#34C759",
        "ios-red": "#FF3B30",
        "ios-orange": "#FF9500",
        "ios-yellow": "#FFCC00",
        "ios-purple": "#AF52DE",
        "ios-pink": "#FF2D55",
        "ios-teal": "#5AC8FA",
        "ios-indigo": "#5856D6",

        // ── System Colors (Apple iOS dark) ──
        "ios-blue-dark": "#0A84FF",
        "ios-green-dark": "#30D158",
        "ios-red-dark": "#FF453A",
        "ios-orange-dark": "#FF9F0A",
        "ios-yellow-dark": "#FFD60A",
        "ios-purple-dark": "#BF5AF2",
        "ios-pink-dark": "#FF375F",
        "ios-teal-dark": "#64D2FF",
        "ios-indigo-dark": "#5E5CE6",

        // ── System Grays ──
        "ios-gray": {
          1: "#8E8E93",
          2: "#AEAEB2",
          3: "#C7C7CC",
          4: "#D1D1D6",
          5: "#E5E5EA",
          6: "#F2F2F7",
        },
        "ios-gray-dark": {
          1: "#8E8E93",
          2: "#636366",
          3: "#48484A",
          4: "#3A3A3C",
          5: "#2C2C2E",
          6: "#1C1C1E",
        },

        // ── Separator ──
        "ios-separator": "#C6C6C8",
        "ios-separator-dark": "#38383A",

        // ── Health metric colors ──
        "health-heart": "#FF2D55",
        "health-sleep": "#5856D6",
        "health-activity": "#34C759",
        "health-energy": "#FF9500",
        "health-mood": "#5AC8FA",

        // ── Score traffic-light (WHOOP) ──
        "score-excellent": "#34C759",
        "score-moderate": "#FF9500",
        "score-poor": "#FF3B30",
      },

      fontFamily: {
        "inter": ["Inter-Regular"],
        "inter-medium": ["Inter-Medium"],
        "inter-semibold": ["Inter-SemiBold"],
        "inter-bold": ["Inter-Bold"],
      },

      fontSize: {
        "ios-large-title": ["34px", { lineHeight: "41px" }],
        "ios-title1": ["28px", { lineHeight: "34px" }],
        "ios-title2": ["22px", { lineHeight: "28px" }],
        "ios-title3": ["20px", { lineHeight: "25px" }],
        "ios-headline": ["17px", { lineHeight: "22px" }],
        "ios-body": ["17px", { lineHeight: "22px" }],
        "ios-callout": ["16px", { lineHeight: "21px" }],
        "ios-subheadline": ["15px", { lineHeight: "20px" }],
        "ios-footnote": ["13px", { lineHeight: "18px" }],
        "ios-caption1": ["12px", { lineHeight: "16px" }],
        "ios-caption2": ["11px", { lineHeight: "13px" }],
      },

      borderRadius: {
        "ios-sm": "8px",
        "ios": "10px",
        "ios-lg": "14px",
        "ios-xl": "20px",
      },

      spacing: {
        "ios-xs": "4px",
        "ios-sm": "8px",
        "ios-md": "12px",
        "ios-base": "16px",
        "ios-lg": "20px",
        "ios-xl": "24px",
        "ios-2xl": "32px",
        "ios-3xl": "40px",
        "ios-4xl": "48px",
      },
    },
  },
  plugins: [],
};
