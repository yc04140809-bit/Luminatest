import type { Agent, Task } from "@chaos-ai-suite/shared";

/**
 * AI Office画面専用の表示ステータス。既存の Agent.status（standby/thinking/writing/meeting/
 * reviewing/offline）は一切変更せず、それとTaskの状態から導出するだけの表示レイヤー。
 * 既存のオフィスビュー（OfficeBoard/AgentDesk）や既存のAgentStatus型には影響しない。
 */
export type OfficeAgentStatus =
  | "idle" | "working" | "researching" | "meeting" | "waiting_review" | "completed" | "error" | "resting";

export const OFFICE_STATUS_LABEL: Record<OfficeAgentStatus, string> = {
  idle: "待機中",
  working: "作業中",
  researching: "リサーチ中",
  meeting: "会議中",
  waiting_review: "確認待ち",
  completed: "完了",
  error: "エラー",
  resting: "休憩中",
};

export const OFFICE_STATUS_ICON: Record<OfficeAgentStatus, string> = {
  idle: "💤",
  working: "💻",
  researching: "🔍",
  meeting: "💬",
  waiting_review: "🙋",
  completed: "🎉",
  error: "⚠️",
  resting: "☕",
};

/** 完了直後(この時間以内)は「完了」演出を出す。それ以降は待機中に戻る。 */
const COMPLETED_HIGHLIGHT_MS = 5 * 60_000;

export function deriveOfficeStatus(agent: Agent, tasks: Task[], now = Date.now()): OfficeAgentStatus {
  if (!agent.enabled) return "resting";

  if (agent.status === "meeting") return "meeting";
  if (agent.status === "thinking") return "researching";
  if (agent.status === "writing") return "working";
  if (agent.status === "reviewing") return "waiting_review";
  if (agent.status === "offline") return "resting";

  // standby: 直近タスクの状態から、確認待ち・エラー・完了直後を判定する
  const myTasks = tasks
    .filter((task) => task.assignedAgentId === agent.id)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const latest = myTasks[0];
  if (!latest) return "idle";

  if (latest.status === "blocked" || latest.status === "rejected") return "error";
  if (latest.status === "awaiting_approval") return "waiting_review";
  if (latest.status === "completed" || latest.status === "approved") {
    const elapsed = now - new Date(latest.updatedAt).getTime();
    if (elapsed < COMPLETED_HIGHLIGHT_MS) return "completed";
  }
  return "idle";
}

/** そのAI社員が担当した直近タスク（新しい順）。「直近の仕事」「成果物」表示に使う。 */
export function recentTasksFor(agentId: string, tasks: Task[], limit = 10): Task[] {
  return tasks
    .filter((task) => task.assignedAgentId === agentId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}
