/** アプリ全体の配色トークン。個別AI社員のアクセントカラーはAgent.accentColorで別管理する。 */
export interface ThemeTokens {
  bg: string;
  panel: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  gold: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  tokens: ThemeTokens;
}

/**
 * 現在の配色設定。プリセット選択＋個別上書き（overrides）の組み合わせで解決する。
 * overridesに含まれないトークンはプリセットの値をそのまま使う。
 */
export interface ThemeSettings {
  presetId: string;
  overrides: Partial<ThemeTokens>;
}

export type ThemeUpdateInput = {
  presetId?: string;
  overrides?: Partial<ThemeTokens>;
  resetOverrides?: boolean;
};
