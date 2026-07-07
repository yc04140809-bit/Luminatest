import type { OfficeState } from "../types/officeState.js";
import { SEED_AGENTS } from "./seedAgents.js";

/** バックエンド起動時の初期OfficeState。タスク・メッセージは空の状態から開始する。 */
export function buildSeedOfficeState(): OfficeState {
  const agents = Object.fromEntries(SEED_AGENTS.map((agent) => [agent.id, agent]));
  return {
    agents,
    tasks: {},
    messages: [],
    activeMeetings: [],
    pendingApprovalTaskIds: [],
    lastUpdated: new Date().toISOString(),
  };
}
