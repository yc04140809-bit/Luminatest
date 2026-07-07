import { useState } from "react";
import { Check, Plug, X } from "lucide-react";
import type { Agent, Task } from "@chaos-ai-suite/shared";
import { approveTask, rejectTask } from "../api/officeApi.js";

interface ToolApprovalModalProps {
  task: Task;
  agent?: Agent;
  onClose: () => void;
}

/**
 * 「[エージェント名]が外部連携の実行を申請しています。承認しますか？」の確認ポップアップ。
 * 新しい外部ツール実行申請（Task.pendingToolCall）が現れた瞬間に自動表示される（App.tsx側で検知）。
 * 「後で確認する」を押しても申請自体は承認待ちキューに残り続ける。
 */
export function ToolApprovalModal({ task, agent, onClose }: ToolApprovalModalProps) {
  const [busy, setBusy] = useState(false);
  const pending = task.pendingToolCall;
  if (!pending) return null;

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
            {JSON.stringify(pending.input, null, 2)}
          </pre>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => handle("approve")}
            disabled={busy}
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
