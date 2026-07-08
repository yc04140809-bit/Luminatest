/** 日本時間での今日の日付（"YYYY-MM-DD"）。朝会ブリーフィングの自動実行判定に使う。バックエンドのtodayInTokyo()と揃える。 */
export function todayInTokyo(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}
