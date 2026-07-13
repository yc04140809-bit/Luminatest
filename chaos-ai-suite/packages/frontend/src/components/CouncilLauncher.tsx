import { useState } from "react";
import { Gavel } from "lucide-react";
import { COUNCIL_CATEGORIES, type CouncilRequestCategory } from "@chaos-ai-suite/shared";
import { startCouncil } from "../api/officeApi.js";

interface CouncilLauncherProps {
  /** 既に進行中のAI会議がある場合、新規開始ボタンを無効化する。 */
  councilRunning: boolean;
}

/**
 * AI会議モード（作成役→検証役→統合役→人間承認）のランチャー。
 * 依頼の種類に応じて役割を簡易ルールで割り当てる（COUNCIL_ROLE_RULES、バックエンド側で解決）。
 */
export function CouncilLauncher({ councilRunning }: CouncilLauncherProps) {
  const [requestText, setRequestText] = useState("");
  const [category, setCategory] = useState<CouncilRequestCategory>("sns");
  const [costCapText, setCostCapText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!requestText.trim() || sending || councilRunning) return;

    const costCapUsd = costCapText.trim() ? Number(costCapText.trim()) : undefined;
    if (costCapText.trim() && (!Number.isFinite(costCapUsd) || (costCapUsd as number) <= 0)) {
      setError("費用上限は0より大きい数値で入力してください。");
      return;
    }

    setSending(true);
    setError(null);
    try {
      await startCouncil({ requestText: requestText.trim(), category, costCapUsd });
      setRequestText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-xl border border-office-border bg-office-panel p-4">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
        <Gavel size={18} />
        AI会議モード
      </h2>
      <p className="mb-3 text-xs text-office-muted">
        作成役→検証役→統合役の3人が順番に処理し、最後は必ずあなたの承認を経てから成果物になります。
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-office-muted">依頼の種類</label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as CouncilRequestCategory)}
            disabled={councilRunning}
            className="w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text disabled:opacity-50"
          >
            {COUNCIL_CATEGORIES.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.label}</option>
            ))}
          </select>
        </div>

        <textarea
          value={requestText}
          onChange={(event) => setRequestText(event.target.value)}
          placeholder="例）Threads投稿を1本作りたい。読者は初心者、テーマはAIツールの使い方"
          rows={3}
          disabled={councilRunning}
          className="w-full resize-none rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted disabled:opacity-50"
        />

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-office-muted">費用上限（任意・USD）</label>
          <input
            value={costCapText}
            onChange={(event) => setCostCapText(event.target.value)}
            placeholder="例）0.5"
            inputMode="decimal"
            disabled={councilRunning}
            className="w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted disabled:opacity-50"
          />
          <p className="mt-1 text-[11px] text-office-muted">概算費用がこの金額を超えそうな場合、実行前に警告して停止します。</p>
        </div>

        {councilRunning && (
          <p className="text-xs text-office-gold">AI会議が進行中です。終了するまでお待ちください。</p>
        )}
        {error && <p className="text-xs text-red-400">開始に失敗しました: {error}</p>}

        <button
          type="submit"
          disabled={sending || councilRunning || !requestText.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-office-gold px-3 py-2 text-sm font-semibold text-office-bg transition disabled:opacity-40"
        >
          {sending ? "開始中..." : "AI会議を開始"}
        </button>
      </form>
    </section>
  );
}
