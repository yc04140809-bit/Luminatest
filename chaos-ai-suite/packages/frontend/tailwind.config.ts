import type { Config } from "tailwindcss";

/**
 * office.* の色はすべてCSS変数（index.cssで既定値を宣言、useApplyThemeで実行時に上書き）を参照する。
 * これにより管理画面のテーマ切り替え・カスタムカラーがビルド不要で全画面に即時反映される。
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        office: {
          bg: "var(--office-bg)",
          panel: "var(--office-panel)",
          border: "var(--office-border)",
          text: "var(--office-text)",
          muted: "var(--office-muted)",
          accent: "var(--office-accent)",
          gold: "var(--office-gold)",
        },
      },
      fontFamily: {
        display: ["'Orbitron'", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 16px color-mix(in srgb, var(--office-accent) 55%, transparent)",
      },
    },
  },
  plugins: [],
} satisfies Config;
