import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        sm: "100%",
        md: "100%",
        lg: "100%",
        xl: "1240px",
        "2xl": "1240px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // brand — sampled from the Destow logo
        navy: "#1C2331",
        brand: {
          DEFAULT: "#0B52F5",
          600: "#0A47D6",
          400: "#3D74FF",
          100: "#E9F0FE",
          50: "#F5F8FF",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 6px)",
        sm: "calc(var(--radius) - 10px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.04), 0 12px 32px -12px rgba(11,82,245,.14)",
        float: "0 24px 60px -28px rgba(11,82,245,.30), 0 8px 24px -16px rgba(16,24,40,.12)",
        ring: "0 0 0 1px rgba(16,24,40,.06)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pin-drop": {
          "0%": { opacity: "0", transform: "translateY(-10px) scale(.8)" },
          "60%": { opacity: "1", transform: "translateY(2px) scale(1.05)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pin-pulse": {
          "0%,100%": { opacity: ".55", transform: "scale(1)" },
          "50%": { opacity: "0", transform: "scale(2.4)" },
        },
        "dash": {
          to: { "stroke-dashoffset": "0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up .7s cubic-bezier(.22,.7,.3,1) both",
        "pin-drop": "pin-drop .6s cubic-bezier(.22,.7,.3,1) both",
        "pin-pulse": "pin-pulse 2.6s ease-in-out infinite",
        dash: "dash 2.2s ease-in-out .3s both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
