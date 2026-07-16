import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Gavel, Square, X } from "lucide-react";
import { COUNCIL_CATEGORIES, COUNCIL_PHASE_LABELS, type Agent, type CouncilSession } from "@chaos-ai-suite/shared";
import { approveCouncil, discardCouncil, reviseCouncil, stopCouncil } from "../api/officeApi.js";
import { saveCouncilHistory } from "../utils/councilHistory.js";
import { detectSuspiciousUnicode } from "../utils/suspiciousUnicode.js";

interface CouncilRoomProps {
  session: CouncilSession;
  agents: Record<string, Agent>;
  onClose: () => void;
}

function agentName(id: string, agents: Record<string, Agent>): string {
  return agents[id]?.name ?? id;
}

function categoryLabel(id: string): string {
  return COUNCIL_CATEGORIES.find((entry) => entry.id === id)?.label ?? id;
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

const btnAction = "w-full rounded-lg px-3 py-3 text-sm font-semibold transition disabled:opacity-40";

/**
 * AI会議モードの進行画面。上部に概要と停止ボタン、中央に段階ごとの折りたたみカード、
 * 下部（承認待ちの間のみ）に承認/修正/再検証/破棄/通常チャットへ戻るのボタン群を固定表示する。
 * 統合役の最終案が承認されるまで、成果物は一切保存・実行されない。
 */
export function CouncilRoom({ session, agents, onClose }: CouncilRoomProps) {
  const [open, setOpen] = useState<Set<string>>(new Set(["overview", "final"]));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [ackFinalDraft, setAckFinalDraft] = useState(false);
  const savedHistoryForId = useRef<string | null>(null);

  // 承認直後のsessionはpropsとして古いスナップショット（concludedAt未設定など）を参照している
  // おそれがあるため、承認保存はここでWebSocket経由の最新session（実際に更新された値）を待って行う。
  useEffect(() => {
    if (session.status === "approved" && savedHistoryForId.current !== session.id) {
      saveCouncilHistory(session);
      savedHistoryForId.current = session.id;
    }
  }, [session]);

  // セッションが変わったら不可視文字の確認状態をリセットする（別の会議の確認を引き継がない）。
  useEffect(() => {
    setAckFinalDraft(false);
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

  function handleApprove(): void {
    // 保存はuseEffect側で行う（このsessionは承認前のスナップショットのため、
    // ここで直接保存するとconcludedAt等がサーバーの実際の更新値と食い違う）。
    void runAction("approve", () => approveCouncil(session.id));
  }

  function handleDiscard(): void {
    if (!window.confirm("この成果物を破棄します。よろしいですか？")) return;
    void runAction("discard", () => discardCouncil(session.id));
  }

  function handleRevise(withInstruction: boolean): void {
    void runAction(withInstruction ? "revise" : "reverify", async () => {
      await reviseCouncil(session.id, withInstruction ? revisionInstruction.trim() : undefined);
      setRevisionInstruction("");
    });
  }

  function handleStop(): void {
    void runAction("stop", () => stopCouncil(session.id));
  }

  const isRunning = session.status === "running";
  const isAwaitingApproval = session.status === "awaiting_approval";
  const costText = session.estimatedCostUsd < 0.01 ? `$${session.estimatedCostUsd.toFixed(4)}` : `$${session.estimatedCostUsd.toFixed(2)}`;

  const suspiciousFinal = session.finalDraft ? detectSuspiciousUnicode(session.finalDraft) : { found: false, matches: [] };
  const uniqueFinalCodePoints = [...new Set(suspiciousFinal.matches.map((m) => m.codePoint))];
  const approveBlocked = suspiciousFinal.found && !ackFinalDraft;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
      <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-xl text-office-gold">
          <Gavel size={20} />
          AI会議モード
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
          <p className="mb-1 whitespace-pre-wrap break-words"><span className="font-semibold text-office-muted">依頼内容:</span> {session.requestText}</p>
          <p className="mb-1"><span className="font-semibold text-office-muted">種類:</span> {categoryLabel(session.category)}</p>
          <p className="mb-1">
            <span className="font-semibold text-office-muted">現在の処理段階:</span>{" "}
            {session.status === "failed" ? "エラーで停止" : session.status === "discarded" ? "破棄済み" : session.status === "approved" ? "承認済み" : session.status === "changes_requested" ? "修正依頼済み" : COUNCIL_PHASE_LABELS[session.phase]}
          </p>
          <p className="mb-1">
            <span className="font-semibold text-office-muted">使用予定のAI社員:</span>{" "}
            作成役 {agentName(session.drafterAgentId, agents)} → 検証役 {agentName(session.verifierAgentId, agents)} → 統合役 {agentName(session.integratorAgentId, agents)}
          </p>
          <p className="mb-1">
            <span className="font-semibold text-office-muted">概算費用:</span> {costText}
            {session.costCapUsd !== undefined && ` / 上限 $${session.costCapUsd}`}
            {` （呼び出し ${session.calls.length}/${session.maxCalls}回）`}
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

        {session.draft && (
          <Card title="作成役の結果" open={open.has("draft")} onToggle={() => toggle("draft")}>
            <p className="whitespace-pre-wrap text-sm text-office-text">{session.draft}</p>
            {session.draftAssumptions.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-[11px] font-semibold text-office-muted">不明点・仮定した前提</p>
                <ul className="list-inside list-disc text-xs text-office-muted">
                  {session.draftAssumptions.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </div>
            )}
          </Card>
        )}

        {session.verification && (
          <Card title="検証役の指摘" open={open.has("verify")} onToggle={() => toggle("verify")}>
            <div className="space-y-2 text-xs text-office-text">
              <div>
                <p className="mb-1 font-semibold text-office-muted">問題点</p>
                {session.verification.issues.length > 0 ? (
                  <ul className="list-inside list-disc">{session.verification.issues.map((item, i) => <li key={i}>{item}</li>)}</ul>
                ) : <p className="text-office-muted">（指摘なし）</p>}
              </div>
              <div>
                <p className="mb-1 font-semibold text-office-muted">修正案</p>
                {session.verification.fixSuggestions.length > 0 ? (
                  <ul className="list-inside list-disc">{session.verification.fixSuggestions.map((item, i) => <li key={i}>{item}</li>)}</ul>
                ) : <p className="text-office-muted">（なし）</p>}
              </div>
              <div>
                <p className="mb-1 font-semibold text-office-muted">リスク</p>
                {session.verification.risks.length > 0 ? (
                  <ul className="list-inside list-disc">{session.verification.risks.map((item, i) => <li key={i}>{item}</li>)}</ul>
                ) : <p className="text-office-muted">（なし）</p>}
              </div>
            </div>
          </Card>
        )}

        {session.finalDraft && (
          <Card title="統合役の最終案" open={open.has("final")} onToggle={() => toggle("final")} badge={isAwaitingApproval ? "承認待ち" : undefined}>
            <p className="whitespace-pre-wrap rounded-lg border border-office-gold/40 bg-office-gold/5 px-3 py-3 text-sm leading-relaxed text-office-text">
              {session.finalDraft}
            </p>
            {session.remainingRisks.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-[11px] font-semibold text-office-muted">残存リスク</p>
                <ul className="list-inside list-disc text-xs text-office-muted">
                  {session.remainingRisks.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </div>
            )}
          </Card>
        )}

        {session.status === "failed" && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-3 text-xs text-red-300">
            <p className="font-semibold">エラーで処理を停止しました</p>
            <p className="mt-1">段階: {session.errorPhase ? COUNCIL_PHASE_LABELS[session.errorPhase] : "不明"}</p>
            <p className="mt-1">内容: {session.errorMessage}</p>
            <p className="mt-1">ここまでの呼び出し回数: {session.calls.length}回（費用は発生しています）</p>
            <p className="mt-1">再実行するには、もう一度「AI会議を開始」から依頼してください。</p>
          </div>
        )}

        {(session.status === "discarded" || session.status === "approved") && (
          <p className="rounded-lg border border-office-border bg-office-bg px-3 py-2.5 text-xs text-office-muted">
            {session.status === "approved" ? "この成果物は承認済みです。承認済み成果物の履歴に保存されています。" : "この会議は破棄されました。成果物は保存されていません。"}
          </p>
        )}
      </div>

      {isAwaitingApproval && (
        <div className="sticky bottom-0 border-t border-office-border bg-office-panel px-5 py-4">
          {suspiciousFinal.found && (
            <div className="mb-3 rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-xs text-red-300">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={14} /> 統合役の最終案に、画面に見えない特殊な文字が含まれています
              </p>
              <p className="mt-1 text-red-300/90">
                検出コード: {uniqueFinalCodePoints.join(", ")}
                （ゼロ幅文字・双方向制御文字など）。承認前に内容をよく確認してください。
              </p>
              <label className="mt-2 flex items-start gap-2 text-red-200">
                <input
                  type="checkbox"
                  checked={ackFinalDraft}
                  onChange={(event) => setAckFinalDraft(event.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                内容を確認しました。それでも承認する
              </label>
            </div>
          )}
          <textarea
            value={revisionInstruction}
            onChange={(event) => setRevisionInstruction(event.target.value)}
            placeholder="修正を依頼する場合は、変えてほしい内容をここに書いてください（任意）"
            rows={2}
            className="mb-3 w-full resize-none rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={busy !== null || approveBlocked}
              title={approveBlocked ? "不可視文字の内容を確認してからでないと承認できません" : undefined}
              className={`${btnAction} col-span-2 bg-office-gold text-office-bg`}
            >
              {busy === "approve" ? "承認中..." : "承認する"}
            </button>
            <button
              type="button"
              onClick={() => handleRevise(true)}
              disabled={busy !== null || !revisionInstruction.trim()}
              className={`${btnAction} border border-office-border text-office-text hover:border-office-gold hover:text-office-gold`}
            >
              {busy === "revise" ? "修正中..." : "修正を依頼"}
            </button>
            <button
              type="button"
              onClick={() => handleRevise(false)}
              disabled={busy !== null}
              className={`${btnAction} border border-office-border text-office-text hover:border-office-gold hover:text-office-gold`}
            >
              {busy === "reverify" ? "検証中..." : "もう一度検証"}
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={busy !== null}
              className={`${btnAction} border border-red-500/50 text-red-400 hover:bg-red-500/10`}
            >
              破棄する
            </button>
            <button type="button" onClick={onClose} disabled={busy !== null} className={`${btnAction} border border-office-border text-office-muted`}>
              通常チャットへ戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
