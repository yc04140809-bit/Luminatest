import type { OfficeState } from "../types/officeState.js";
import { SEED_AGENTS } from "./seedAgents.js";
import { DEFAULT_THEME_SETTINGS } from "./themePresets.js";

/** バックエンド起動時の初期OfficeState。タスク・メッセージは空の状態から開始する。 */
export function buildSeedOfficeState(): OfficeState {
  const agents = Object.fromEntries(SEED_AGENTS.map((agent) => [agent.id, agent]));
  return {
    agents,
    tasks: {},
    messages: [],
    activeMeetings: [],
    pendingApprovalTaskIds: [],
    theme: { ...DEFAULT_THEME_SETTINGS, overrides: {} },
    strategyMeetings: {},
    lastUpdated: new Date().toISOString(),
  };
}
