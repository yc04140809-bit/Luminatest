import type { ToolExecutor } from "./types.js";
import { secretsStore } from "../config/secretsStore.js";
import { getGoogleAccessToken } from "./googleAuth.js";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const DEFAULT_DURATION_MS = 30 * 60 * 1000;

/**
 * セイラちゃんが分解済みタスクの期限をGoogleカレンダーへ登録するツール。
 * 対象カレンダーは事前にサービスアカウントのメールアドレスと共有し、GOOGLE_CALENDAR_IDに
 * そのカレンダーIDを設定しておく必要がある（サービスアカウントには「primary」個人カレンダーが無いため）。
 */
export const googleCalendarTool: ToolExecutor = {
  definition: {
    id: "calendar_event",
    name: "Googleカレンダーに登録",
    description: "タスクの期限をGoogleカレンダーの予定として登録する。",
    allowedAgentIds: ["agent-sayla"],
    inputSchema: {
      properties: {
        title: { type: "string", description: "予定のタイトル" },
        description: { type: "string", description: "予定の詳細（タスク内容の要約など）" },
        startAt: { type: "string", description: "開始日時（ISO 8601形式）" },
        endAt: { type: "string", description: "終了日時（ISO 8601形式、省略時は開始から30分後）" },
      },
      required: ["title", "startAt"],
    },
  },
  async execute({ input }) {
    const calendarId = secretsStore.get("GOOGLE_CALENDAR_ID");
    if (!calendarId) {
      throw new Error("Googleカレンダー連携が設定されていません。設定画面でGOOGLE_CALENDAR_IDを入力してください。");
    }
    const accessToken = await getGoogleAccessToken([CALENDAR_SCOPE]);

    const title = String(input.title ?? "無題の予定");
    const startAt = new Date(String(input.startAt));
    if (Number.isNaN(startAt.getTime())) throw new Error(`startAtの日時形式が不正です: ${input.startAt}`);
    const endAt = input.endAt ? new Date(String(input.endAt)) : new Date(startAt.getTime() + DEFAULT_DURATION_MS);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: title,
          description: input.description ? String(input.description) : undefined,
          start: { dateTime: startAt.toISOString() },
          end: { dateTime: endAt.toISOString() },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Googleカレンダーへの登録に失敗しました (${response.status}): ${await response.text()}`);
    }

    const body = (await response.json()) as { htmlLink?: string };
    return {
      summary: `Googleカレンダーに「${title}」を登録しました（${startAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}）。${body.htmlLink ?? ""}`.trim(),
      data: body,
    };
  },
};
