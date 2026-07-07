import { useState } from "react";
import { Check, X } from "lucide-react";
import type { Agent, Task } from "@chaos-ai-suite/shared";
import { approveTask, rejectTask } from "../api/officeApi.js";

interface ApprovalQueueProps {
  tasks: Task[];
  agents: Record<string, Agent>;
}

/** Human-in-the-loopの承認ゲート。重要な成果物はここで代表の承認/差し戻しを待つ。 */
export function ApprovalQueue({ tasks, agents }: ApprovalQueueProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handle(taskId: string, action: "approve" | "reject"): Promise<void> {
    setBusyId(taskId);
    try {
      await (action === "approve" ? approveTask(taskId) : rejectTask(taskId));
    } finally {
      setBusyId(null);
    }
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
              {task.output && (
                <p className="mt-2 whitespace-pre-wrap rounded bg-office-bg p-2 text-xs text-office-text">
                  {task.output}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handle(task.id, "approve")}
                  disabled={busyId === task.id}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  <Check size={14} /> 承認
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
