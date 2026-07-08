/** 「来週月曜」等の相対日付表現をAIが正しく解決できるよう、現在の日本時間を明示するテキスト。 */
export function currentDateTimeText(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

/** 日本時間での今日の日付（"YYYY-MM-DD"）。朝会ブリーフィングの「本日実施済みか」判定に使う。 */
export function todayInTokyo(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}
