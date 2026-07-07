/** 代表からの指示投入・承認操作用のAPIクライアント。状態そのものは /ws/office 経由で反映される。 */

async function postJson(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `request failed: ${res.status}`);
  }
}

/** 全体指示。targetAgentIdを指定すると、その社員への個別メンション指示になる。 */
export function postDirective(directive: string, targetAgentId?: string): Promise<void> {
  return postJson("/api/directives", targetAgentId ? { directive, targetAgentId } : { directive });
}

export function approveTask(taskId: string, comment?: string): Promise<void> {
  return postJson(`/api/tasks/${taskId}/approve`, { comment });
}

export function rejectTask(taskId: string, comment?: string): Promise<void> {
  return postJson(`/api/tasks/${taskId}/reject`, { comment });
}
