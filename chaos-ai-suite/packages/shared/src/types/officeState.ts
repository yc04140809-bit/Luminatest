import type { Agent } from "./agent.js";
import type { Task } from "./task.js";
import type { Message } from "./message.js";
import type { ThemeSettings } from "./theme.js";
import type { StrategyMeeting } from "./meeting.js";
import type { BrandProfile } from "./brandProfile.js";
import type { CouncilSession } from "./council.js";

/** 進行中の作戦会議（例: セイラちゃん×レヴィちゃんのタスク分解会議）。 */
export interface ActiveMeeting {
  id: string;
  topic: string;
  participantAgentIds: string[];
  relatedTaskId?: string;
  startedAt: string;
}

/**
 * オフィス全体のスナップショット。フロントエンドはこの型をポーリング/WebSocketで受け取り
 * オフィスビュー・タイムラインビューの両方を描画する。
 */
export interface OfficeState {
  agents: Record<string, Agent>;
  tasks: Record<string, Task>;
  /** 直近N件の社内チャットログ（全文はページング取得を想定） */
  messages: Message[];
  activeMeetings: ActiveMeeting[];
  /** 代表の承認を待っているタスクIDの一覧 */
  pendingApprovalTaskIds: string[];
  /** 管理画面から変更できる配色設定 */
  theme: ThemeSettings;
  /** 自律型・戦略経営会議のセッション記録（フェーズ・発言ログ・議事録・提案） */
  strategyMeetings: Record<string, StrategyMeeting>;
  /** ケイオス師匠ブランド設定（SNS投稿・note記事・商品紹介文などの生成時に反映） */
  brandProfile: BrandProfile;
  /** AI会議モード（作成役→検証役→統合役→人間承認）のセッション記録 */
  councilSessions: Record<string, CouncilSession>;
  /** 朝会ブリーフィングを最後に実施した日付（"YYYY-MM-DD"、日本時間）。未実施ならundefined。 */
  lastBriefingDate?: string;
  lastUpdated: string;
}

/** サーバー→クライアントのリアルタイム更新イベント。 */
export type OfficeEvent =
  | { type: "agent_updated"; agent: Agent }
  | { type: "agent_deleted"; agentId: string }
  | { type: "task_updated"; task: Task }
  | { type: "message_created"; message: Message }
  | { type: "meeting_started"; meeting: ActiveMeeting }
  | { type: "meeting_ended"; meetingId: string }
  | { type: "theme_updated"; theme: ThemeSettings }
  | { type: "strategy_meeting_updated"; meeting: StrategyMeeting }
  | { type: "briefing_completed"; date: string }
  | { type: "brand_profile_updated"; brandProfile: BrandProfile }
  | { type: "council_session_updated"; session: CouncilSession }
  | { type: "office_state_snapshot"; state: OfficeState };
