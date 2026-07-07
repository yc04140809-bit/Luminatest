import type { ThemePreset, ThemeSettings, ThemeTokens } from "../types/theme.js";

/** 管理画面のプリセットテーマ切り替えで選べる配色パターン。 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "cyber-neon",
    name: "サイバーネオン",
    description: "現行のダーク×ネオンレッド。冷静で近未来的なオフィス。",
    tokens: {
      bg: "#0a0a12",
      panel: "#12121e",
      border: "#23233a",
      text: "#e6e6f0",
      muted: "#8888a8",
      accent: "#ff3b5c",
      gold: "#d4af37",
    },
  },
  {
    id: "royal-purple",
    name: "ロイヤルパープル",
    description: "紫×ゴールドの高級感。落ち着いた重役オフィスの雰囲気。",
    tokens: {
      bg: "#14101f",
      panel: "#1d1830",
      border: "#332a4d",
      text: "#f0e9ff",
      muted: "#a89bc9",
      accent: "#7c5cff",
      gold: "#f2c14e",
    },
  },
  {
    id: "daylight",
    name: "デイライト",
    description: "明るいホワイトベースのオフィス。昼間の会議室のような清潔感。",
    tokens: {
      bg: "#f5f3ef",
      panel: "#ffffff",
      border: "#e2ddd3",
      text: "#1f1b2e",
      muted: "#6b6478",
      accent: "#e14f68",
      gold: "#b8860b",
    },
  },
  {
    id: "monochrome",
    name: "モノクローム",
    description: "白黒グレーのミニマルなオフィス。装飾を抑えた集中モード。",
    tokens: {
      bg: "#0d0d0d",
      panel: "#171717",
      border: "#2b2b2b",
      text: "#ececec",
      muted: "#8a8a8a",
      accent: "#e5e5e5",
      gold: "#c9c9c9",
    },
  },
];

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  presetId: THEME_PRESETS[0]!.id,
  overrides: {},
};

/** プリセット＋個別上書きを合成し、実際に描画に使う配色トークンを得る。 */
export function resolveThemeTokens(theme: ThemeSettings, presets: ThemePreset[] = THEME_PRESETS): ThemeTokens {
  const preset = presets.find((candidate) => candidate.id === theme.presetId) ?? presets[0]!;
  return { ...preset.tokens, ...theme.overrides };
}
