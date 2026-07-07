import { useState } from "react";
import { X } from "lucide-react";
import type { Agent, AgentDraft } from "@chaos-ai-suite/shared";
import { createAgent, updateAgent } from "../api/officeApi.js";

interface AgentEditorModalProps {
  /** 未指定なら新規作成モード */
  agent?: Agent;
  onClose: () => void;
}

interface FormState {
  name: string;
  title: string;
  roleKey: string;
  description: string;
  responsibilitiesText: string;
  triggersText: string;
  systemPrompt: string;
  accentColor: string;
  avatarUrl: string;
  deskX: string;
  deskY: string;
  provider: string;
  model: string;
  temperature: string;
  maxOutputTokens: string;
  enabled: boolean;
}

function toFormState(agent?: Agent): FormState {
  return {
    name: agent?.name ?? "",
    title: agent?.title ?? "",
    roleKey: agent?.roleKey ?? "",
    description: agent?.description ?? "",
    responsibilitiesText: agent?.responsibilities.join("\n") ?? "",
    triggersText: agent?.triggers.join("\n") ?? "",
    systemPrompt: agent?.systemPrompt ?? "",
    accentColor: agent?.accentColor ?? "#8b7cf6",
    avatarUrl: agent?.avatarUrl ?? "",
    deskX: String(agent?.deskPosition.x ?? 0),
    deskY: String(agent?.deskPosition.y ?? 0),
    provider: agent?.model.provider ?? "anthropic",
    model: agent?.model.model ?? "claude-sonnet-5",
    temperature: String(agent?.model.temperature ?? 0.5),
    maxOutputTokens: String(agent?.model.maxOutputTokens ?? 1536),
    enabled: agent?.enabled ?? true,
  };
}

function toDraft(form: FormState): AgentDraft {
  return {
    name: form.name.trim(),
    title: form.title.trim(),
    roleKey: form.roleKey.trim(),
    description: form.description.trim(),
    responsibilities: form.responsibilitiesText.split("\n").map((line) => line.trim()).filter(Boolean),
    triggers: form.triggersText.split("\n").map((line) => line.trim()).filter(Boolean),
    systemPrompt: form.systemPrompt,
    accentColor: form.accentColor,
    avatarUrl: form.avatarUrl.trim() || undefined,
    deskPosition: { x: Number(form.deskX) || 0, y: Number(form.deskY) || 0 },
    model: {
      provider: form.provider.trim() || "anthropic",
      model: form.model.trim() || "claude-sonnet-5",
      temperature: Number(form.temperature),
      maxOutputTokens: Number(form.maxOutputTokens) || 1536,
    },
    enabled: form.enabled,
    isEditable: true,
  };
}

const inputClass =
  "w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted";
const labelClass = "mb-1 block text-xs font-semibold text-office-muted";

/** AI社員の新規作成・編集フォーム。役割・システムプロンプト・モデル設定まで、すべてGUIから変更できる。 */
export function AgentEditorModal({ agent, onClose }: AgentEditorModalProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(agent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const draft = toDraft(form);
      if (agent) {
        await updateAgent(agent.id, draft);
      } else {
        await createAgent(draft);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-xl border border-office-border bg-office-panel p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-office-gold">{agent ? `${agent.name} を編集` : "新しいAI社員を追加"}</h3>
          <button type="button" onClick={onClose} className="text-office-muted hover:text-office-text">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>名前</label>
              <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>役職・肩書き</label>
              <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>役割キー（roleKey）</label>
              <input
                className={inputClass}
                value={form.roleKey}
                onChange={(e) => set("roleKey", e.target.value)}
                placeholder="例: customer-care"
                required
              />
            </div>
            <div>
              <label className={labelClass}>アクセントカラー</label>
              <input
                type="color"
                className="h-9 w-full cursor-pointer rounded-lg border border-office-border bg-office-bg"
                value={form.accentColor}
                onChange={(e) => set("accentColor", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>自己紹介・役割サマリー</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>担当業務（1行に1項目）</label>
              <textarea
                className={inputClass}
                rows={4}
                value={form.responsibilitiesText}
                onChange={(e) => set("responsibilitiesText", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>トリガー（1行に1項目）</label>
              <textarea
                className={inputClass}
                rows={4}
                value={form.triggersText}
                onChange={(e) => set("triggersText", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>システムプロンプト（性格・口調・専門知識）</label>
            <textarea
              className={`${inputClass} font-mono text-xs`}
              rows={8}
              value={form.systemPrompt}
              onChange={(e) => set("systemPrompt", e.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelClass}>アバター画像URL（任意・未設定ならちびキャラを表示）</label>
            <input
              className={inputClass}
              value={form.avatarUrl}
              onChange={(e) => set("avatarUrl", e.target.value)}
              placeholder="/avatars/example.png"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={labelClass}>プロバイダ</label>
              <input className={inputClass} value={form.provider} onChange={(e) => set("provider", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>モデル</label>
              <input className={inputClass} value={form.model} onChange={(e) => set("model", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>温度</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                className={inputClass}
                value={form.temperature}
                onChange={(e) => set("temperature", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>最大出力トークン</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.maxOutputTokens}
                onChange={(e) => set("maxOutputTokens", e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-office-text">
            <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
            有効化（無効化するとタスクを受け取らなくなります）
          </label>

          {error && <p className="text-xs text-red-400">保存に失敗しました: {error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-office-border px-4 py-2 text-sm text-office-muted hover:text-office-text"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-office-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? "保存中..." : agent ? "更新する" : "追加する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
