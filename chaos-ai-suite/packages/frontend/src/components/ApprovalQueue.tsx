import { useState } from "react";
import { Check, Plug, X } from "lucide-react";
import type { Agent, Task } from "@chaos-ai-suite/shared";
import { approveTask, rejectTask } from "../api/officeApi.js";
import { saveDocument } from "../utils/savedDocuments.js";

interface ApprovalQueueProps {
  tasks: Task[];
  agents: Record<string, Agent>;
}

/** Human-in-the-loopの承認ゲート。重要な成果物・外部ツール実行の申請はここで代表の承認/差し戻しを待つ。 */
export function ApprovalQueue({ tasks, agents }: ApprovalQueueProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [archiveDecision, setArchiveDecision] = useState<Record<string, "saved" | "dismissed">>({});

  async function handle(taskId: string, action: "approve" | "reject"): Promise<void> {
    setBusyId(taskId);
    try {
      await (action === "approve" ? approveTask(taskId) : rejectTask(taskId));
    } finally {
      setBusyId(null);
    }
  }

  function handleSaveDocument(task: Task): void {
    const agent = task.assignedAgentId ? agents[task.assignedAgentId] : undefined;
    saveDocument({ title: task.title, agentName: agent?.name, content: task.output ?? "" });
    setArchiveDecision((decisions) => ({ ...decisions, [task.id]: "saved" }));
  }

  if (tasks.length === 0) {
    return (
      <section className="rounded-xl border border-office-border bg-office-panel p-4">
        <h2 className="font-display text-lg text-office-gold">承認待ち</h2>
        <p className="mt-2 text-sm text-office-muted">現在、承認が必要な成果物はありません。</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-amber-500/50 bg-office-panel p-4">
      <h2 className="font-display text-lg text-office-gold">承認待ち（{tasks.length}件）</h2>
      <div className="mt-3 space-y-3">
        {tasks.map((task) => {
          const agent = task.assignedAgentId ? agents[task.assignedAgentId] : undefined;
          const isToolCall = Boolean(task.pendingToolCall);
          return (
            <div key={task.id} className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-office-text">{task.title}</p>
                {agent && (
                  <span className="text-xs" style={{ color: agent.accentColor }}>
                    {agent.name}
                  </span>
                )}
              </div>

              {isToolCall && task.pendingToolCall && (
                <div className="mt-2 rounded border border-amber-500/40 bg-office-bg p-2 text-xs">
                  <p className="flex items-center gap-1 font-semibold text-amber-400">
                    <Plug size={12} /> 外部連携の実行申請: {task.pendingToolCall.toolId}
                  </p>
                  {task.pendingToolCall.note && <p className="mt-1 text-office-muted">{task.pendingToolCall.note}</p>}
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-[10px] text-office-muted">
                    {JSON.stringify(task.pendingToolCall.input, null, 2)}
                  </pre>
                </div>
              )}

              {task.output && (
                <>
                  <p className="mt-2 whitespace-pre-wrap rounded bg-office-bg p-2 text-xs text-office-text">
                    {task.output}
                  </p>
                  {archiveDecision[task.id] === "saved" ? (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-400">
                      <Check size={11} /> 書類保管庫に保管しました
                    </p>
                  ) : (
                    archiveDecision[task.id] !== "dismissed" && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="text-office-muted">書類保管庫に保管しますか？</span>
                        <button
                          type="button"
                          onClick={() => handleSaveDocument(task)}
                          className="rounded-full bg-office-gold/20 px-2 py-0.5 font-semibold text-office-gold"
                        >
                          保管する
                        </button>
                        <button
                          type="button"
                          onClick={() => setArchiveDecision((decisions) => ({ ...decisions, [task.id]: "dismissed" }))}
                          className="text-office-muted underline"
                        >
                          不要
                        </button>
                      </div>
                    )
                  )}
                </>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handle(task.id, "approve")}
                  disabled={busyId === task.id}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  <Check size={14} /> {isToolCall ? "承認して実行" : "承認"}
                </button>
                <button
                  type="button"
                  onClick={() => handle(task.id, "reject")}
                  disabled={busyId === task.id}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  <X size={14} /> 差し戻し
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
