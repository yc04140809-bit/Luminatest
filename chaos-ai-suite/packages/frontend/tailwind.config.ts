import type { Config } from "tailwindcss";

/**
 * サイバーパンク/高級感のあるダークモードUIのベース設定。
 * Step3のオフィスビュー実装時に、エージェントごとのaccentColorと組み合わせて使う。
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        office: {
          bg: "#0a0a12",
          panel: "#12121e",
          border: "#23233a",
          text: "#e6e6f0",
          muted: "#8888a8",
          accent: "#ff3b5c",
          gold: "#d4af37",
        },
      },
      fontFamily: {
        display: ["'Orbitron'", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 12px rgba(255, 59, 92, 0.5)",
      },
    },
  },
  plugins: [],
} satisfies Config;
