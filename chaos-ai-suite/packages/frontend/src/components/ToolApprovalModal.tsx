import { useEffect, useState } from "react";
import { AlertTriangle, Check, Plug, X } from "lucide-react";
import type { Agent, Task } from "@chaos-ai-suite/shared";
import { approveTask, rejectTask } from "../api/officeApi.js";
import { detectSuspiciousUnicode } from "../utils/suspiciousUnicode.js";

interface ToolApprovalModalProps {
  task: Task;
  agent?: Agent;
  onClose: () => void;
}

/**
 * 「[エージェント名]が外部連携の実行を申請しています。承認しますか？」の確認ポップアップ。
 * 新しい外部ツール実行申請（Task.pendingToolCall）が現れた瞬間に自動表示される（App.tsx側で検知）。
 * 「後で確認する」を押しても申請自体は承認待ちキューに残り続ける。
 *
 * 表示内容に見えない不可視文字・双方向制御文字が含まれる場合は警告し、
 * 明示的に確認するまで承認ボタンを一時的に無効化する（表示偽装対策）。
 */
export function ToolApprovalModal({ task, agent, onClose }: ToolApprovalModalProps) {
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const pending = task.pendingToolCall;

  useEffect(() => {
    setAcknowledged(false);
  }, [task.id]);

  if (!pending) return null;

  const inputText = JSON.stringify(pending.input, null, 2);
  const suspicious = detectSuspiciousUnicode(`${pending.note ?? ""}\n${inputText}`);
  const uniqueCodePoints = [...new Set(suspicious.matches.map((m) => m.codePoint))];
  const approveBlocked = suspicious.found && !acknowledged;

  async function handle(action: "approve" | "reject"): Promise<void> {
    setBusy(true);
    try {
      await (action === "approve" ? approveTask(task.id) : rejectTask(task.id));
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-amber-500/60 bg-office-panel p-6 shadow-neon">
        <div className="mb-3 flex items-center gap-2">
          <Plug className="text-amber-400" size={20} />
          <h3 className="font-display text-lg text-office-gold">外部連携の実行申請</h3>
        </div>
        <p className="text-sm text-office-text">
          <span className="font-semibold" style={{ color: agent?.accentColor }}>
            {agent?.name ?? "AI社員"}
          </span>
          が外部連携の実行を申請しています。承認しますか？
        </p>
        <div className="mt-3 rounded-lg border border-office-border bg-office-bg p-3 text-xs">
          <p className="font-semibold text-amber-400">ツール: {pending.toolId}</p>
          {pending.note && <p className="mt-1 text-office-muted">{pending.note}</p>}
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[10px] text-office-muted">
            {inputText}
          </pre>
        </div>

        {suspicious.found && (
          <div className="mt-3 rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-xs text-red-300">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle size={14} /> 画面に見えない特殊な文字が含まれています
            </p>
            <p className="mt-1 text-red-300/90">
              検出コード: {uniqueCodePoints.join(", ")}
              （ゼロ幅文字・双方向制御文字など）。表示内容と実際に送信される内容が食い違っている可能性があります。
            </p>
            <label className="mt-2 flex items-start gap-2 text-red-200">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              内容を確認しました。それでも承認する
            </label>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => handle("approve")}
            disabled={busy || approveBlocked}
            title={approveBlocked ? "不可視文字の内容を確認してからでないと承認できません" : undefined}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Check size={16} /> Approve（承認して実行）
          </button>
          <button
            type="button"
            onClick={() => handle("reject")}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            <X size={16} /> 却下
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-center text-xs text-office-muted hover:text-office-text"
        >
          後で確認する（承認待ちリストに残ります）
        </button>
      </div>
    </div>
  );
}
