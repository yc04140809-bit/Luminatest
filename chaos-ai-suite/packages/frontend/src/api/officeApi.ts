/** 代表からの指示投入・承認操作・設定変更用のAPIクライアント。状態そのものは /ws/office 経由で反映される。 */
import type { AgentDraft, ThemeUpdateInput } from "@chaos-ai-suite/shared";

async function sendJson(method: "POST" | "PATCH", path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `request failed: ${res.status}`);
  }
}

async function sendDelete(path: string): Promise<void> {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `request failed: ${res.status}`);
  }
}

/** 全体指示。targetAgentIdを指定すると、その社員への個別メンション指示になる。 */
export function postDirective(directive: string, targetAgentId?: string): Promise<void> {
  return sendJson("POST", "/api/directives", targetAgentId ? { directive, targetAgentId } : { directive });
}

export function approveTask(taskId: string, comment?: string): Promise<void> {
  return sendJson("POST", `/api/tasks/${taskId}/approve`, { comment });
}

export function rejectTask(taskId: string, comment?: string): Promise<void> {
  return sendJson("POST", `/api/tasks/${taskId}/reject`, { comment });
}

/** 管理画面からのプリセット切り替え・カラー上書き。 */
export function updateTheme(patch: ThemeUpdateInput): Promise<void> {
  return sendJson("PATCH", "/api/theme", patch);
}

export function updateAgent(agentId: string, patch: Partial<AgentDraft>): Promise<void> {
  return sendJson("PATCH", `/api/agents/${agentId}`, patch);
}

export function createAgent(draft: AgentDraft): Promise<void> {
  return sendJson("POST", "/api/agents", draft);
}

export function deleteAgent(agentId: string): Promise<void> {
  return sendDelete(`/api/agents/${agentId}`);
}
