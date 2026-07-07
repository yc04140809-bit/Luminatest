import { useEffect } from "react";
import { resolveThemeTokens, type ThemeSettings } from "@chaos-ai-suite/shared";

const CSS_VAR_BY_TOKEN: Record<keyof ReturnType<typeof resolveThemeTokens>, string> = {
  bg: "--office-bg",
  panel: "--office-panel",
  border: "--office-border",
  text: "--office-text",
  muted: "--office-muted",
  accent: "--office-accent",
  gold: "--office-gold",
};

/** OfficeState.themeを解決し、:root のCSSカスタムプロパティへ反映する。全画面のTailwindクラスが即座に追従する。 */
export function useApplyTheme(theme: ThemeSettings | undefined): void {
  useEffect(() => {
    if (!theme) return;
    const tokens = resolveThemeTokens(theme);
    const root = document.documentElement;
    for (const [token, cssVar] of Object.entries(CSS_VAR_BY_TOKEN)) {
      root.style.setProperty(cssVar, tokens[token as keyof typeof tokens]);
    }
  }, [theme]);
}
