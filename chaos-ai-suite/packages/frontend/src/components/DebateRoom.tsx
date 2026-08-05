import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Square, Swords, X } from "lucide-react";
import {
  DEBATE_DECISION_LABELS,
  DEBATE_PHASE_LABELS,
  DEBATE_ROUND_LABELS,
  type Agent,
  type DebateDecision,
  type DebateEntry,
  type DebateSession,
} from "@chaos-ai-suite/shared";
import { decideDebate, stopDebate } from "../api/officeApi.js";
import { getAgentIcon } from "../utils/agentIcons.js";
import { detectSuspiciousUnicode } from "../utils/suspiciousUnicode.js";

interface DebateRoomProps {
  session: DebateSession;
  agents: Record<string, Agent>;
  onClose: () => void;
}

function Card({ title, open, onToggle, children, badge }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode; badge?: string }) {
  return (
    <div className="rounded-lg border border-office-border bg-office-panel">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-3 text-left">
        {open ? <ChevronDown size={14} className="shrink-0 text-office-muted" /> : <ChevronRight size={14} className="shrink-0 text-office-muted" />}
        <span className="flex-1 text-sm font-semibold text-office-text">{title}</span>
        {badge && <span className="shrink-0 rounded-full bg-office-gold/15 px-2 py-0.5 text-[10px] font-semibold text-office-gold">{badge}</span>}
      </button>
      {open && <div className="border-t border-office-border px-3 py-3">{children}</div>}
    </div>
  );
}

function EntryCard({ entry, agents }: { entry: DebateEntry; agents: Record<string, Agent> }) {
  const agent = agents[entry.agentId];
  const Icon = getAgentIcon(agent?.roleKey ?? "management");
  return (
    <div className="rounded-lg border border-office-border bg-office-bg p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={14} style={{ color: agent?.accentColor }} />
        <span className="text-xs font-semibold text-office-text" style={{ color: agent?.accentColor }}>
          {entry.agentName}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-office-text">{entry.content}</p>
      {entry.weaknesses && entry.weaknesses.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-xs text-office-muted">
          {entry.weaknesses.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

const scoreBarCls = "h-1.5 flex-1 overflow-hidden rounded-full bg-office-bg";
const btnAction = "w-full rounded-lg px-3 py-3 text-sm font-semibold transition disabled:opacity-40";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-office-muted">{label}</span>
      <div className={scoreBarCls}>
        <div className="h-full bg-office-gold" style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-office-text">{value}</span>
    </div>
  );
}

/**
 * AI討論会の進行画面。上部に概要と停止ボタン、中央にラウンドごとの折りたたみカード（発言はAI社員名・
 * アイコン・色で区別）、下部（人間の判断待ちの間のみ）に4択の最終判断ボタン群を固定表示する。
 * AIは意思決定者ではないため、この画面のどこにも「AIが自動実行する」導線は存在しない。
 */
export function DebateRoom({ session, agents, onClose }: DebateRoomProps) {
  const [open, setOpen] = useState<Set<string>>(new Set(["overview", "synthesis"]));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [ackSynthesis, setAckSynthesis] = useState(false);

  useEffect(() => {
    setAckSynthesis(false);
    setDecisionNote("");
  }, [session.id]);

  function toggle(id: string): void {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function runAction(key: string, action: () => Promise<void>): Promise<void> {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function handleStop(): void {
    void runAction("stop", () => stopDebate(session.id));
  }

  function handleDecide(decision: DebateDecision): void {
    if (decision === "rejected" && !window.confirm("この議題を却下します。よろしいですか？")) return;
    void runAction(decision, () => decideDebate(session.id, decision, decisionNote.trim() || undefined));
  }

  const isRunning = session.status === "running";
  const isAwaitingApproval = session.status === "awaiting_approval";
  const costText = session.estimatedCostUsd < 0.01 ? `$${session.estimatedCostUsd.toFixed(4)}` : `$${session.estimatedCostUsd.toFixed(2)}`;

  const synthesisText = session.synthesis
    ? `${session.synthesis.improvedProposal}\n${session.synthesis.recommendedAction}`
    : "";
  const suspicious = detectSuspiciousUnicode(synthesisText);
  const uniqueCodePoints = [...new Set(suspicious.matches.map((m) => m.codePoint))];
  const decideBlocked = suspicious.found && !ackSynthesis;

  const opinions = session.entries.filter((e) => e.round === "opinion");
  const rebuttals = session.entries.filter((e) => e.round === "rebuttal");
  const improvements = session.entries.filter((e) => e.round === "improvement");

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
      <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-xl text-office-gold">
          <Swords size={20} />
          AI討論会
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-full border border-office-border px-3 py-1.5 text-sm text-office-muted transition hover:border-office-gold hover:text-office-gold"
        >
          <X size={16} /> 閉じる
        </button>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

        <div className="rounded-lg border border-office-border bg-office-panel p-3 text-xs text-office-text">
          <p className="mb-1 whitespace-pre-wrap break-words"><span className="font-semibold text-office-muted">議題:</span> {session.topic}</p>
          <p className="mb-1">
            <span className="font-semibold text-office-muted">現在の段階:</span>{" "}
            {session.status === "failed" ? "エラーで停止" : session.status === "discarded" ? "破棄済み" : session.status === "concluded" ? `判断済み（${DEBATE_DECISION_LABELS[session.decision ?? "hold"]}）` : DEBATE_PHASE_LABELS[session.phase]}
          </p>
          <p className="mb-1">
            <span className="font-semibold text-office-muted">参加AI社員:</span>{" "}
            {session.participantAgentIds.map((id) => agents[id]?.name ?? id).join(" / ")}
            {" → 統合役 "}
            {agents[session.integratorAgentId]?.name ?? session.integratorAgentId}
          </p>
          <p className="mb-1">
            <span className="font-semibold text-office-muted">概算費用:</span> {costText}
            {session.costCapUsd !== undefined && ` / 上限 $${session.costCapUsd}`}
            {` （呼び出し ${session.calls.length}回）`}
          </p>
          {isRunning && (
            <button
              type="button"
              onClick={handleStop}
              disabled={busy !== null || session.stopRequested}
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-red-500/50 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
            >
              <Square size={12} />
              {session.stopRequested ? "停止処理中..." : "処理を停止する"}
            </button>
          )}
        </div>

        {opinions.length > 0 && (
          <Card title={`ROUND1: ${DEBATE_ROUND_LABELS.opinion}`} open={open.has("opinion")} onToggle={() => toggle("opinion")}>
            <div className="space-y-2">
              {opinions.map((entry, index) => <EntryCard key={index} entry={entry} agents={agents} />)}
            </div>
          </Card>
        )}

        {rebuttals.length > 0 && (
          <Card title={`ROUND2: ${DEBATE_ROUND_LABELS.rebuttal}`} open={open.has("rebuttal")} onToggle={() => toggle("rebuttal")}>
            <div className="space-y-2">
              {rebuttals.map((entry, index) => <EntryCard key={index} entry={entry} agents={agents} />)}
            </div>
          </Card>
        )}

        {improvements.length > 0 && (
          <Card title={`ROUND3: ${DEBATE_ROUND_LABELS.improvement}`} open={open.has("improvement")} onToggle={() => toggle("improvement")}>
            <div className="space-y-2">
              {improvements.map((entry, index) => <EntryCard key={index} entry={entry} agents={agents} />)}
            </div>
          </Card>
        )}

        {session.synthesis && (
          <Card title="FINAL: 統合役の判断材料" open={open.has("synthesis")} onToggle={() => toggle("synthesis")} badge={isAwaitingApproval ? "判断待ち" : undefined}>
            <div className="space-y-3 text-sm text-office-text">
              <div>
                <p className="mb-1 text-[11px] font-semibold text-office-muted">最大のメリット</p>
                <p>{session.synthesis.biggestMerit}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold text-office-muted">最大のリスク</p>
                <p>{session.synthesis.biggestRisk}</p>
              </div>
              {session.synthesis.disagreementPoints.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-office-muted">意見が割れたポイント</p>
                  <ul className="list-inside list-disc text-xs">
                    {session.synthesis.disagreementPoints.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                </div>
              )}
              <div className="rounded-lg border border-office-gold/40 bg-office-gold/5 p-3">
                <p className="mb-1 text-[11px] font-semibold text-office-muted">改善後の最良案</p>
                <p className="whitespace-pre-wrap leading-relaxed">{session.synthesis.improvedProposal}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold text-office-muted">推奨アクション（参考。最終判断は人間が行う）</p>
                <p>{session.synthesis.recommendedAction}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-office-muted">5項目評価（参考値・成果を保証しない）</p>
                <ScoreBar label="市場性" value={session.synthesis.score.marketability} />
                <ScoreBar label="収益性" value={session.synthesis.score.profitability} />
                <ScoreBar label="実現可能性" value={session.synthesis.score.feasibility} />
                <ScoreBar label="差別化" value={session.synthesis.score.differentiation} />
                <ScoreBar label="継続性" value={session.synthesis.score.sustainability} />
              </div>
            </div>
          </Card>
        )}

        {session.status === "failed" && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-3 text-xs text-red-300">
            <p className="font-semibold">エラーで処理を停止しました</p>
            <p className="mt-1">段階: {session.errorPhase ? DEBATE_PHASE_LABELS[session.errorPhase] : "不明"}</p>
            <p className="mt-1">内容: {session.errorMessage}</p>
            <p className="mt-1">ここまでの呼び出し回数: {session.calls.length}回（費用は発生しています）</p>
            <p className="mt-1">再実行するには、もう一度「AI討論を始める」から依頼してください。</p>
          </div>
        )}

        {(session.status === "discarded" || session.status === "concluded") && (
          <p className="rounded-lg border border-office-border bg-office-bg px-3 py-2.5 text-xs text-office-muted">
            {session.status === "concluded"
              ? `この討論会は判断済みです（${DEBATE_DECISION_LABELS[session.decision ?? "hold"]}）。${session.decisionNote ? ` メモ: ${session.decisionNote}` : ""}`
              : "この討論会は途中で停止・破棄されました。"}
          </p>
        )}
      </div>

      {isAwaitingApproval && (
        <div className="sticky bottom-0 border-t border-office-border bg-office-panel px-5 py-4">
          {suspicious.found && (
            <div className="mb-3 rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-xs text-red-300">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={14} /> 統合結果に、画面に見えない特殊な文字が含まれています
              </p>
              <p className="mt-1 text-red-300/90">
                検出コード: {uniqueCodePoints.join(", ")}（ゼロ幅文字・双方向制御文字など）。判断前に内容をよく確認してください。
              </p>
              <label className="mt-2 flex items-start gap-2 text-red-200">
                <input
                  type="checkbox"
                  checked={ackSynthesis}
                  onChange={(event) => setAckSynthesis(event.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                内容を確認しました。それでも判断を進める
              </label>
            </div>
          )}
          <textarea
            value={decisionNote}
            onChange={(event) => setDecisionNote(event.target.value)}
            placeholder="「修正して実行」を選ぶ場合は、変更したい条件をここに書いてください（任意）"
            rows={2}
            className="mb-3 w-full resize-none rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDecide("run_as_is")}
              disabled={busy !== null || decideBlocked}
              title={decideBlocked ? "不可視文字の内容を確認してからでないと判断できません" : undefined}
              className={`${btnAction} bg-office-gold text-office-bg`}
            >
              {busy === "run_as_is" ? "処理中..." : DEBATE_DECISION_LABELS.run_as_is}
            </button>
            <button
              type="button"
              onClick={() => handleDecide("run_modified")}
              disabled={busy !== null || decideBlocked}
              title={decideBlocked ? "不可視文字の内容を確認してからでないと判断できません" : undefined}
              className={`${btnAction} border border-office-gold text-office-gold hover:bg-office-gold/10`}
            >
              {busy === "run_modified" ? "処理中..." : DEBATE_DECISION_LABELS.run_modified}
            </button>
            <button
              type="button"
              onClick={() => handleDecide("hold")}
              disabled={busy !== null}
              className={`${btnAction} border border-office-border text-office-text hover:border-office-gold hover:text-office-gold`}
            >
              {busy === "hold" ? "処理中..." : DEBATE_DECISION_LABELS.hold}
            </button>
            <button
              type="button"
              onClick={() => handleDecide("rejected")}
              disabled={busy !== null}
              className={`${btnAction} border border-red-500/50 text-red-400 hover:bg-red-500/10`}
            >
              {busy === "rejected" ? "処理中..." : DEBATE_DECISION_LABELS.rejected}
            </button>
          </div>
          <button type="button" onClick={onClose} disabled={busy !== null} className="mt-2 w-full text-center text-xs text-office-muted hover:text-office-text">
            後で判断する（判断待ちリストに残ります）
          </button>
        </div>
      )}
    </div>
  );
}
