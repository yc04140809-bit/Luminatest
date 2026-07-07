import { useMemo, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { THEME_PRESETS, resolveThemeTokens, type Agent, type ThemeSettings, type ThemeTokens } from "@chaos-ai-suite/shared";
import { updateAgent, updateTheme } from "../api/officeApi.js";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback.js";
import { AgentManagerPanel } from "./AgentManagerPanel.js";

interface SettingsPanelProps {
  theme: ThemeSettings;
  agents: Agent[];
  onClose: () => void;
}

type SettingsTab = "theme" | "agents";

const TOKEN_LABELS: Record<keyof ThemeTokens, string> = {
  bg: "背景",
  panel: "パネル",
  border: "境界線",
  text: "テキスト",
  muted: "サブテキスト",
  accent: "アクセント",
  gold: "ゴールド",
};

const SWATCH_TOKENS: (keyof ThemeTokens)[] = ["bg", "panel", "accent", "gold"];

function previewCssVar(token: keyof ThemeTokens, value: string): void {
  document.documentElement.style.setProperty(`--office-${token}`, value);
}

/** 配色管理画面。プリセット切り替え・トークン単位のカスタムカラー・AI社員ごとのアクセントカラーを編集する。 */
export function SettingsPanel({ theme, agents, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<SettingsTab>("theme");
  const tokens = useMemo(() => resolveThemeTokens(theme), [theme]);

  const commitThemeOverride = useDebouncedCallback((token: keyof ThemeTokens, value: string) => {
    void updateTheme({ overrides: { [token]: value } });
  }, 250);

  const commitAgentColor = useDebouncedCallback((agentId: string, value: string) => {
    void updateAgent(agentId, { accentColor: value });
  }, 250);

  function handleTokenChange(token: keyof ThemeTokens, value: string): void {
    previewCssVar(token, value);
    commitThemeOverride(token, value);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col gap-6 overflow-y-auto border-l border-office-border bg-office-panel p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-office-gold">設定</h2>
          <button type="button" onClick={onClose} className="text-office-muted hover:text-office-text">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 border-b border-office-border pb-2">
          <button
            type="button"
            onClick={() => setTab("theme")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              tab === "theme" ? "bg-office-accent text-white" : "text-office-muted hover:text-office-text"
            }`}
          >
            配色
          </button>
          <button
            type="button"
            onClick={() => setTab("agents")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              tab === "agents" ? "bg-office-accent text-white" : "text-office-muted hover:text-office-text"
            }`}
          >
            AI社員管理
          </button>
        </div>

        {tab === "agents" && <AgentManagerPanel agents={agents} />}

        {tab === "theme" && (
          <>
            <section>
              <h3 className="mb-2 text-sm font-semibold text-office-text">プリセットテーマ</h3>
              <div className="grid grid-cols-2 gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => void updateTheme({ presetId: preset.id })}
                    className={`rounded-lg border p-2 text-left text-xs transition ${
                      theme.presetId === preset.id
                        ? "border-office-gold"
                        : "border-office-border hover:border-office-muted"
                    }`}
                  >
                    <div className="mb-1 flex gap-1">
                      {SWATCH_TOKENS.map((token) => (
                        <span
                          key={token}
                          className="h-4 w-4 rounded-full border border-office-border"
                          style={{ backgroundColor: preset.tokens[token] }}
                        />
                      ))}
                    </div>
                    <p className="font-semibold text-office-text">{preset.name}</p>
                    <p className="text-office-muted">{preset.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-office-text">カスタムカラー</h3>
                <button
                  type="button"
                  onClick={() => void updateTheme({ resetOverrides: true })}
                  className="flex items-center gap-1 text-xs text-office-muted hover:text-office-text"
                >
                  <RotateCcw size={12} /> リセット
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(TOKEN_LABELS) as (keyof ThemeTokens)[]).map((token) => (
                  <label key={token} className="flex items-center gap-2 text-xs text-office-text">
                    <input
                      type="color"
                      value={tokens[token]}
                      onChange={(event) => handleTokenChange(token, event.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border border-office-border bg-transparent"
                    />
                    {TOKEN_LABELS[token]}
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-office-text">AI社員のアクセントカラー</h3>
              <div className="space-y-2">
                {agents.map((agent) => (
                  <label key={agent.id} className="flex items-center gap-3 text-xs text-office-text">
                    <input
                      type="color"
                      defaultValue={agent.accentColor}
                      onChange={(event) => commitAgentColor(agent.id, event.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border border-office-border bg-transparent"
                    />
                    <span className="font-semibold">{agent.name}</span>
                    <span className="text-office-muted">{agent.title}</span>
                  </label>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
