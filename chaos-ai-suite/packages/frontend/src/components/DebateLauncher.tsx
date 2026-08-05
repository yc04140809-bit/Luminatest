import { useState } from "react";
import { Swords } from "lucide-react";
import { DEBATE_MAX_PARTICIPANTS, DEBATE_MIN_PARTICIPANTS, type Agent } from "@chaos-ai-suite/shared";
import { startDebate } from "../api/officeApi.js";

interface DebateLauncherProps {
  agents: Agent[];
  /** 既に進行中のAI討論会がある場合、新規開始ボタンを無効化する。 */
  debateRunning: boolean;
}

const DEFAULT_PARTICIPANT_IDS = ["agent-mirai", "agent-sayla", "agent-levi"];

/**
 * AI討論会（初期意見→相互反論→改善案→統合→人間承認）のランチャー。
 * 参加AI社員はデフォルト3人（ミライ・セイラ・レヴィ）から変更でき、統合役は常にケイオス（バックエンド側で固定）。
 */
export function DebateLauncher({ agents, debateRunning }: DebateLauncherProps) {
  const [topic, setTopic] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>(DEFAULT_PARTICIPANT_IDS);
  const [costCapText, setCostCapText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableAgents = agents.filter((agent) => agent.enabled);

  function toggleParticipant(agentId: string): void {
    setParticipantIds((prev) => {
      if (prev.includes(agentId)) return prev.filter((id) => id !== agentId);
      if (prev.length >= DEBATE_MAX_PARTICIPANTS) return prev;
      return [...prev, agentId];
    });
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!topic.trim() || sending || debateRunning) return;
    if (participantIds.length < DEBATE_MIN_PARTICIPANTS) {
      setError(`参加AI社員は${DEBATE_MIN_PARTICIPANTS}人以上選んでください。`);
      return;
    }

    const costCapUsd = costCapText.trim() ? Number(costCapText.trim()) : undefined;
    if (costCapText.trim() && (!Number.isFinite(costCapUsd) || (costCapUsd as number) <= 0)) {
      setError("費用上限は0より大きい数値で入力してください。");
      return;
    }

    setSending(true);
    setError(null);
    try {
      await startDebate({ topic: topic.trim(), participantAgentIds: participantIds, costCapUsd });
      setTopic("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-xl border border-office-border bg-office-panel p-4">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
        <Swords size={18} />
        AI討論会
      </h2>
      <p className="mb-3 text-xs text-office-muted">
        複数のAI社員が初期意見→反論→改善案の順で意見をぶつけ合い、最後にケイオスが判断材料へ統合します。
        最終判断は必ずあなたが行います（AIだけで実行を決めません）。
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="例）このサービスを月額980円で販売するべきか？"
          rows={3}
          disabled={debateRunning}
          className="w-full resize-none rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted disabled:opacity-50"
        />

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-office-muted">
            討論に参加させるAI社員（{DEBATE_MIN_PARTICIPANTS}〜{DEBATE_MAX_PARTICIPANTS}人）
          </label>
          <div className="flex flex-wrap gap-2">
            {selectableAgents.map((agent) => {
              const checked = participantIds.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggleParticipant(agent.id)}
                  disabled={debateRunning}
                  className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                    checked
                      ? "border-office-gold bg-office-gold/15 text-office-gold"
                      : "border-office-border text-office-muted hover:border-office-gold/50"
                  }`}
                >
                  {agent.name}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-office-muted">統合役は固定でケイオスが担当します（参加者には含まれません）。</p>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-office-muted">費用上限（任意・USD）</label>
          <input
            value={costCapText}
            onChange={(event) => setCostCapText(event.target.value)}
            placeholder="例）1.0"
            inputMode="decimal"
            disabled={debateRunning}
            className="w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted disabled:opacity-50"
          />
          <p className="mt-1 text-[11px] text-office-muted">概算費用がこの金額を超えそうな場合、実行前に警告して停止します。</p>
        </div>

        {debateRunning && <p className="text-xs text-office-gold">AI討論会が進行中です。終了するまでお待ちください。</p>}
        {error && <p className="text-xs text-red-400">開始に失敗しました: {error}</p>}

        <button
          type="submit"
          disabled={sending || debateRunning || !topic.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-office-gold px-3 py-2 text-sm font-semibold text-office-bg transition disabled:opacity-40"
        >
          {sending ? "開始中..." : "AI討論を始める"}
        </button>
      </form>
    </section>
  );
}
