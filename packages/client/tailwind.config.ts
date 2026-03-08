import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "error-banner":
          "linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(220,38,38,0.1) 100%)",
        "green-gradient": "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
        "indigo-gradient": "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
        "indigo-gradient-deep": "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)",
        "lobby-divider":
          "linear-gradient(to right, transparent, rgba(129,140,248,0.3) 20%, rgba(129,140,248,0.3) 80%, transparent)",
        "lobby-orb-indigo": "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
        "lobby-orb-violet": "radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)",
        "lobby-shell": "linear-gradient(135deg, #EEF2FF 0%, #F8FAFE 50%, #FAF5FF 100%)",
        "result-win":
          "linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(129,140,248,0.1) 50%, rgba(250,245,255,0.95) 100%)",
      },
      boxShadow: {
        "action-green": "0 4px 12px rgba(34,197,94,0.35), 0 0 0 1px rgba(255,255,255,0.2) inset",
        "action-indigo": "0 4px 12px rgba(99,102,241,0.35), 0 0 0 1px rgba(255,255,255,0.2) inset",
        "card-indigo": "0 8px 24px rgba(99,102,241,0.15), 0 0 0 1px rgba(255,255,255,0.2) inset",
        "card-indigo-strong": "0 12px 32px rgba(99,102,241,0.25), 0 0 0 1px rgba(255,255,255,0.3) inset",
        "modal-indigo": "0 24px 64px rgba(99,102,241,0.25), 0 0 0 1px rgba(129,140,248,0.3)",
      },
      colors: {
        "room-host": "#4a6fa5",
      },
      fontFamily: {
        poppins: ["Poppins", "Segoe UI", "Hiragino Sans", "Noto Sans JP", "sans-serif"],
        inter: ["Inter", "Open Sans", "Segoe UI", "Hiragino Sans", "Noto Sans JP", "sans-serif"],
      },
      keyframes: {
        // === Shared / Common ===
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(.95)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "spin-reverse": {
          to: { transform: "rotate(-360deg)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-5px)" },
          "40%, 80%": { transform: "translateX(5px)" },
        },
        "icon-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "icon-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-100%)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pill-in": {
          from: { opacity: "0", transform: "scale(.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        // === City Chase ===
        "cc-pulse": {
          "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(37,140,244,0.7)" },
          "70%": { transform: "scale(1)", boxShadow: "0 0 0 10px rgba(37,140,244,0)" },
          "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(37,140,244,0)" },
        },
        "cc-pulse-danger": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(220,38,38,0.6)" },
          "50%": { boxShadow: "0 0 0 8px rgba(220,38,38,0)" },
        },
        "cc-criminal-glow": {
          "0%, 100%": { boxShadow: "0 0 4px 2px rgba(220,38,38,0.3)" },
          "50%": { boxShadow: "0 0 10px 4px rgba(220,38,38,0.5)" },
        },
        "cc-heli-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(37,140,244,0.4)" },
          "50%": { boxShadow: "0 0 0 5px rgba(37,140,244,0)" },
        },
        "cc-highlight-green": {
          "0%, 100%": { boxShadow: "0 0 0 3px rgba(34,197,94,0), 0 0 6px 2px rgba(34,197,94,0)" },
          "50%": { boxShadow: "0 0 0 3px rgba(34,197,94,.6), 0 0 6px 2px rgba(34,197,94,.3)" },
        },
        "cc-highlight-amber": {
          "0%, 100%": { boxShadow: "0 0 0 3px rgba(245,158,11,0), 0 0 6px 2px rgba(245,158,11,0)" },
          "50%": { boxShadow: "0 0 0 3px rgba(245,158,11,.6), 0 0 6px 2px rgba(245,158,11,.3)" },
        },
        "cc-highlight-intersection": {
          "0%, 100%": { boxShadow: "0 0 0 2px rgba(34,197,94,0), 0 0 4px 1px rgba(34,197,94,0)" },
          "50%": { boxShadow: "0 0 0 2px rgba(34,197,94,.7), 0 0 4px 1px rgba(34,197,94,.4)" },
        },
      },
      animation: {
        // Shared
        "fade-in": "fade-in .25s ease",
        "fade-in-up": "fade-in-up .5s ease both",
        "bounce-in": "bounce-in .6s ease-out",
        "spin-slow": "spin-slow 1s cubic-bezier(0.4,0,0.2,1) infinite",
        "spin-reverse": "spin-reverse 0.75s cubic-bezier(0.4,0,0.2,1) infinite",
        shake: "shake .4s ease",
        "icon-float": "icon-float 3s ease-in-out infinite",
        "icon-pulse": "icon-pulse 3s ease-in-out infinite",
        "slide-down": "slide-down .4s ease",
        "pill-in": "pill-in .35s ease both",
        "slide-in-right": "slide-in-right .3s ease",
        // Citychase
        "cc-pulse": "cc-pulse 2s infinite",
        "cc-pulse-danger": "cc-pulse-danger 2s infinite",
        "cc-criminal-glow": "cc-criminal-glow 2s ease-in-out infinite",
        "cc-heli-pulse": "cc-heli-pulse 1.5s ease-in-out infinite",
        "cc-highlight-green": "cc-highlight-green 1.2s ease-in-out infinite",
        "cc-highlight-amber": "cc-highlight-amber 1.2s ease-in-out infinite",
        "cc-highlight-intersection": "cc-highlight-intersection 1.2s ease-in-out infinite",
      },
      zIndex: {
        header: "900",
        "header-popover": "930",
        modal: "950",
        overlay: "1090",
        sidebar: "1100",
        invite: "1200",
        "invite-modal": "1300",
        "room-error": "2000",
        scanlines: "9999",
      },
    },
  },
  safelist: [{ pattern: /^nya-dice-rolling-[1-6]$/ }],
  plugins: [],
};

export default config;
