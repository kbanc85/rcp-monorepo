import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium dark palette - "Obsidian" theme (matches extension)
        background: {
          DEFAULT: "#0a0a0b",
          secondary: "#111113",
          tertiary: "#18181b",
          elevated: "#1f1f23",
          hover: "#27272a",
        },
        foreground: {
          DEFAULT: "#fafafa",
          secondary: "#a1a1aa",
          muted: "#71717a",
          subtle: "#52525b",
        },
        // Vibrant coral accent
        accent: {
          DEFAULT: "#ff6b4a",
          hover: "#ff8566",
          muted: "#ff6b4a20",
          glow: "#ff6b4a40",
        },
        // Supporting colors
        success: {
          DEFAULT: "#22c55e",
          muted: "#22c55e20",
        },
        warning: {
          DEFAULT: "#f59e0b",
          muted: "#f59e0b20",
        },
        error: {
          DEFAULT: "#ef4444",
          muted: "#ef444420",
        },
        // Border colors
        border: {
          DEFAULT: "#27272a",
          hover: "#3f3f46",
          focus: "#52525b",
        },
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glow: "0 0 20px -5px var(--tw-shadow-color)",
        "glow-sm": "0 0 10px -3px var(--tw-shadow-color)",
        elevated: "0 8px 30px rgba(0, 0, 0, 0.4)",
        "elevated-sm": "0 4px 20px rgba(0, 0, 0, 0.3)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
        soft: "0 2px 8px rgba(0, 0, 0, 0.15)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        noise:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "fade-out": "fadeOut 0.2s ease-in",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "spin-slow": "spin 20s linear infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(255, 107, 74, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(255, 107, 74, 0.6)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
