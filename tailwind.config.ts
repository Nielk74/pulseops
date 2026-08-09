import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tremor: {
          brand: {
            faint: "#ecfdf5",
            muted: "#a7f3d0",
            subtle: "#34d399",
            DEFAULT: "#22c55e",
            emphasis: "#15803d",
            inverted: "#ffffff"
          },
          background: { muted: "#f8fafc", subtle: "#f1f5f9", DEFAULT: "#ffffff", emphasis: "#334155" },
          border: { DEFAULT: "#e2e8f0" },
          ring: { DEFAULT: "#e2e8f0" },
          content: { subtle: "#94a3b8", DEFAULT: "#64748b", emphasis: "#334155", strong: "#0f172a", inverted: "#ffffff" }
        },
        "dark-tremor": {
          brand: { faint: "#052e16", muted: "#166534", subtle: "#22c55e", DEFAULT: "#4ade80", emphasis: "#86efac", inverted: "#020617" },
          background: { muted: "#020617", subtle: "#0f172a", DEFAULT: "#111827", emphasis: "#334155" },
          border: { DEFAULT: "#334155" },
          ring: { DEFAULT: "#475569" },
          content: { subtle: "#64748b", DEFAULT: "#94a3b8", emphasis: "#cbd5e1", strong: "#f8fafc", inverted: "#020617" }
        },
        pulse: {
          bg: "#020617",
          surface: "#0f172a",
          raised: "#111827",
          border: "#334155",
          text: "#f8fafc",
          muted: "#94a3b8",
          green: "#4ade80",
          amber: "#fbbf24",
          red: "#f87171",
          blue: "#60a5fa"
        }
      },
      boxShadow: {
        "tremor-card": "0 1px 3px 0 rgb(0 0 0 / 0.1)",
        "dark-tremor-card": "0 1px 2px 0 rgb(0 0 0 / 0.45)",
        glow: "0 0 32px rgb(34 197 94 / 0.08)"
      },
      borderRadius: {
        "tremor-small": "0.375rem",
        "tremor-default": "0.5rem",
        "tremor-full": "9999px"
      },
      fontFamily: {
        sans: ["Fira Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Fira Code Variable", "ui-monospace", "SFMono-Regular", "monospace"]
      }
    }
  },
  plugins: [forms]
};

export default config;
