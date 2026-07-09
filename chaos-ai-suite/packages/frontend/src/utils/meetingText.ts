import type { StrategyMeeting } from "@chaos-ai-suite/shared";

/** 会議記録をダウンロード用のプレーンテキストに整形する。 */
export function meetingToText(meeting: StrategyMeeting): string {
  const lines = [
    `戦略経営会議: ${meeting.topic}`,
    `日時: ${new Date(meeting.startedAt).toLocaleString("ja-JP")}`,
    "",
    "■ 議事録",
    meeting.minutes ?? "(なし)",
    "",
    "■ タスク案",
    ...(meeting.actionItems && meeting.actionItems.length > 0 ? meeting.actionItems.map((item) => `・${item}`) : ["(なし)"]),
    "",
    "■ 最終提案",
    meeting.proposal ?? "(なし)",
  ];
  return lines.join("\n");
}

/** ファイル名に使えない文字を落として安全なファイル名にする。 */
export function meetingFileName(meeting: StrategyMeeting): string {
  const safeTopic = meeting.topic.replace(/[\\/:*?"<>|]/g, "").slice(0, 40);
  const date = meeting.startedAt.slice(0, 10);
  return `会議録_${date}_${safeTopic || meeting.id}.txt`;
}
