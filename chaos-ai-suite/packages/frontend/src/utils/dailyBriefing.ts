import type { Agent, Task } from "@chaos-ai-suite/shared";
import { todayInTokyo } from "./dateUtil.js";

/**
 * 「今日のブリーフィング」のテンプレートベース生成（AI不使用）。既存のTask一覧を
 * ローカルで集計するだけで、単純な集計にAIを呼び出さないというコスト方針を徹底する。
 * 将来「AI社員からのおすすめ行動」だけをAI生成に差し替えられるよう、その部分だけ
 * recommendedActions として分離してある（現状はテンプレート文言）。
 */
export interface DailyBriefing {
  date: string;
  priorityTasks: Task[];
  inProgressTasks: Task[];
  awaitingReviewTasks: Task[];
  completedYesterday: Task[];
  recommendedActions: string[];
  greetingText: string;
}

function isYesterday(iso: string, today: string): boolean {
  const date = new Date(iso);
  const yesterday = new Date(date);
  yesterday.setDate(date.getDate());
  const dateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(date);
  if (dateStr === today) return false;
  const todayDate = new Date(`${today}T00:00:00+09:00`);
  const diffDays = Math.round((todayDate.getTime() - new Date(`${dateStr}T00:00:00+09:00`).getTime()) / 86_400_000);
  return diffDays === 1;
}

export function buildDailyBriefing(tasks: Task[], agents: Record<string, Agent>): DailyBriefing {
  const today = todayInTokyo();

  const awaitingReviewTasks = tasks.filter((task) => task.status === "awaiting_approval");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress" || task.status === "handed_off");
  const completedYesterday = tasks.filter(
    (task) => (task.status === "completed" || task.status === "approved") && isYesterday(task.updatedAt, today),
  );

  const priorityTasks = [...awaitingReviewTasks, ...inProgressTasks].slice(0, 3);

  const recommendedActions: string[] = [];
  if (awaitingReviewTasks.length > 0) {
    recommendedActions.push(`確認待ちの成果物が${awaitingReviewTasks.length}件あります。内容を確認しましょう。`);
  }
  if (inProgressTasks.length > 0) {
    recommendedActions.push(`進行中のタスクが${inProgressTasks.length}件あります。`);
  }
  if (priorityTasks.length === 0) {
    recommendedActions.push("現在、優先度の高いタスクはありません。新しい仕事を頼んでみましょう。");
  }

  const lines: string[] = ["おはよう師匠。"];
  if (completedYesterday.length > 0) {
    lines.push(`昨日は${completedYesterday.length}件の仕事が完了しました。`);
  }
  if (priorityTasks.length > 0) {
    lines.push(`今日は次の${priorityTasks.length}件を優先すると良さそうです。`);
    priorityTasks.forEach((task, index) => lines.push(`${index + 1}. ${task.title}（担当: ${agents[task.assignedAgentId ?? ""]?.name ?? "未定"}）`));
  } else {
    lines.push("今日は特に優先度の高い仕事はありません。");
  }
  if (awaitingReviewTasks.length > 0) {
    lines.push(`確認待ちの成果物が${awaitingReviewTasks.length}件あります。`);
  }
  lines.push("どれから進める？");

  return {
    date: today,
    priorityTasks,
    inProgressTasks,
    awaitingReviewTasks,
    completedYesterday,
    recommendedActions,
    greetingText: lines.join("\n"),
  };
}
