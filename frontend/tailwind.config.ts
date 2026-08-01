import type { Config } from "tailwindcss";

// Design tokens — see README "Design notes" for the reasoning behind these.
// 2 neutrals (near-black surfaces, cool-gray text/borders) + 1 accent (red,
// reserved for 5xx / error-level anomalies only). Status/level colors are a
// small deliberate semantic ramp, not default Tailwind palette colors.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0B0D0F",
          surface: "#14171A",
          surfaceHover: "#191D20",
          border: "#262B2F",
          borderStrong: "#33393E",
        },
        text: {
          primary: "#E4E7EA",
          secondary: "#8A9099",
          dim: "#5B6167",
        },
        accent: {
          DEFAULT: "#F0483E", // reserved: 5xx, error/fatal level, anomaly markers only
          dim: "#3A2220",
        },
        warn: {
          DEFAULT: "#D9A441",
          dim: "#332B18",
        },
        ok: {
          DEFAULT: "#5FA88F",
          dim: "#1B2924",
        },
        info: {
          DEFAULT: "#7C93A8",
          dim: "#1E252B",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.2rem" }],
      },
      animation: {
        none: "none",
      },
    },
  },
  plugins: [],
};

export default config;
